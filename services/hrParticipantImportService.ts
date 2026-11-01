/**
 * HR Module Participant Bulk Import Service
 * Handles CSV parsing, field mapping to Firestore schema, pre-upload validation,
 * and batch transformation for NDIS participant documents.
 */

import { Client, ClientGoal } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';

export interface ParticipantFieldMapping {
  name: string;
  ndisNumber: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  primaryDisability: string;
  status: string;
  planManagementType: string;
  totalBudget: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  riskLevel: string;
  planStartDate: string;
  planEndDate: string;
}

export type RowStatus = 'ERROR' | 'WARNING' | 'VALID';

export interface FieldValidationIssue {
  field: keyof ParticipantFieldMapping | 'general';
  fieldName: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidatedParticipantRow {
  rowId: string;
  rowIndex: number;
  selected: boolean;
  status: RowStatus;
  statusColor: 'red' | 'amber' | 'emerald';
  issues: FieldValidationIssue[];
  mapped: {
    name: string;
    ndisNumber: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    primaryDisability: string;
    status: 'Active' | 'Onboarding' | 'Archived' | 'Pending Plan';
    planManagementType: 'Agency-Managed (NDIA)' | 'Plan-Managed' | 'Self-Managed' | 'NDIA-Managed';
    totalBudget: number;
    emergencyContactName: string;
    emergencyContactPhone: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    planStartDate: string;
    planEndDate: string;
  };
  raw: Record<string, string>;
}

export interface ImportValidationResult {
  totalRows: number;
  errorCount: number;
  warningCount: number;
  validCount: number;
  rows: ValidatedParticipantRow[];
}

/**
 * Robust CSV parser supporting quotes, multi-line values, and delimiter auto-detection
 */
export function parseParticipantCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = csvText.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = '\t';
  }

  // Parse CSV respecting quotation marks
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  // Push final field/row if not empty
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const headers = rawHeaders.filter((h) => h.length > 0);

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const rowValues = lines[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      rowObj[header] = (rowValues[c] || '').replace(/^["']|["']$/g, '').trim();
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Auto-detect column mappings to Firestore Client fields
 */
export function autoDetectFieldMappings(headers: string[]): ParticipantFieldMapping {
  const findMatch = (candidates: string[]): string => {
    for (const cand of candidates) {
      const found = headers.find((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === target || clean.includes(target);
      });
      if (found) return found;
    }
    return '';
  };

  return {
    name: findMatch(['Participant Name', 'Client Name', 'Full Name', 'Participant', 'Name', 'First Last']),
    ndisNumber: findMatch(['NDIS Number', 'NDIS No', 'NDIS #', 'NDIS', 'Client Number', 'Participant ID']),
    dateOfBirth: findMatch(['Date of Birth', 'DOB', 'Birth Date', 'Birthdate']),
    email: findMatch(['Email Address', 'Email', 'Contact Email']),
    phone: findMatch(['Phone Number', 'Phone', 'Mobile', 'Contact Phone', 'Telephone']),
    primaryDisability: findMatch(['Primary Disability', 'Disability', 'Diagnosis', 'Condition']),
    status: findMatch(['Status', 'Client Status', 'Participant Status']),
    planManagementType: findMatch(['Plan Management', 'Management Type', 'Plan Type']),
    totalBudget: findMatch(['Total Budget', 'Budget', 'Allocated Budget', 'Plan Value']),
    emergencyContactName: findMatch(['Emergency Contact', 'Next of Kin', 'Emergency Name']),
    emergencyContactPhone: findMatch(['Emergency Phone', 'Next of Kin Phone', 'Emergency Mobile']),
    riskLevel: findMatch(['Risk Level', 'Risk', 'Acuity']),
    planStartDate: findMatch(['Plan Start', 'Plan Start Date', 'Start Date']),
    planEndDate: findMatch(['Plan End', 'Plan End Date', 'End Date', 'Review Date']),
  };
}

/**
 * Pre-upload validation check:
 * Identifies missing mandatory fields, malformed formats, and duplicate records
 */
export function preUploadValidationCheck(
  rawRows: Record<string, string>[],
  mapping: ParticipantFieldMapping,
  existingClients: Client[] = []
): ImportValidationResult {
  const existingNdisNumbers = new Set(
    existingClients.map((c) => c.ndisNumber?.replace(/[^0-9]/g, '')).filter(Boolean)
  );
  const seenNdisInBatch = new Map<string, number>();

  const validatedRows: ValidatedParticipantRow[] = rawRows.map((raw, index) => {
    const issues: FieldValidationIssue[] = [];

    // Extract mapped values
    const rawName = (mapping.name ? raw[mapping.name] : '') || '';
    const rawNdis = (mapping.ndisNumber ? raw[mapping.ndisNumber] : '') || '';
    const rawDob = (mapping.dateOfBirth ? raw[mapping.dateOfBirth] : '') || '';
    const rawEmail = (mapping.email ? raw[mapping.email] : '') || '';
    const rawPhone = (mapping.phone ? raw[mapping.phone] : '') || '';
    const rawDisability = (mapping.primaryDisability ? raw[mapping.primaryDisability] : '') || '';
    const rawStatus = (mapping.status ? raw[mapping.status] : '') || '';
    const rawPlanType = (mapping.planManagementType ? raw[mapping.planManagementType] : '') || '';
    const rawBudget = (mapping.totalBudget ? raw[mapping.totalBudget] : '') || '';
    const rawEmergencyName = (mapping.emergencyContactName ? raw[mapping.emergencyContactName] : '') || '';
    const rawEmergencyPhone = (mapping.emergencyContactPhone ? raw[mapping.emergencyContactPhone] : '') || '';
    const rawRisk = (mapping.riskLevel ? raw[mapping.riskLevel] : '') || '';
    const rawStartDate = (mapping.planStartDate ? raw[mapping.planStartDate] : '') || '';
    const rawEndDate = (mapping.planEndDate ? raw[mapping.planEndDate] : '') || '';

    // 1. Mandatory Validation: Full Name
    const nameTrimmed = rawName.trim();
    if (!nameTrimmed) {
      issues.push({
        field: 'name',
        fieldName: 'Participant Name',
        message: 'Missing mandatory participant full name.',
        severity: 'error',
      });
    } else if (nameTrimmed.length < 2) {
      issues.push({
        field: 'name',
        fieldName: 'Participant Name',
        message: 'Participant name is too short (min 2 characters).',
        severity: 'error',
      });
    } else if (nameTrimmed.toLowerCase().includes('sample') || nameTrimmed.toLowerCase().includes('test')) {
      issues.push({
        field: 'name',
        fieldName: 'Participant Name',
        message: 'Name contains test or placeholder keyword.',
        severity: 'warning',
      });
    }

    // 2. Mandatory Validation: NDIS Number
    const ndisDigitsOnly = rawNdis.replace(/[^0-9]/g, '');
    const hasLettersInNdis = /[a-zA-Z]/.test(rawNdis);

    if (!rawNdis.trim()) {
      issues.push({
        field: 'ndisNumber',
        fieldName: 'NDIS Number',
        message: 'Missing NDIS Number. NDIS format requires 9 digits (starts with 43).',
        severity: 'error',
      });
    } else if (hasLettersInNdis) {
      issues.push({
        field: 'ndisNumber',
        fieldName: 'NDIS Number',
        message: `NDIS number contains alphabetical characters: "${rawNdis}". Must be numeric only.`,
        severity: 'error',
      });
    } else if (ndisDigitsOnly.length !== 9) {
      issues.push({
        field: 'ndisNumber',
        fieldName: 'NDIS Number',
        message: `Invalid NDIS length (${ndisDigitsOnly.length} digits). Official NDIS numbers are exactly 9 digits.`,
        severity: 'error',
      });
    } else if (!ndisDigitsOnly.startsWith('43')) {
      issues.push({
        field: 'ndisNumber',
        fieldName: 'NDIS Number',
        message: `NDIS number does not start with standard '43' prefix ("${ndisDigitsOnly}").`,
        severity: 'warning',
      });
    }

    // Duplicate check
    if (ndisDigitsOnly.length === 9) {
      if (existingNdisNumbers.has(ndisDigitsOnly)) {
        issues.push({
          field: 'ndisNumber',
          fieldName: 'NDIS Number',
          message: `NDIS number ${ndisDigitsOnly} already exists in Firestore.`,
          severity: 'warning',
        });
      }
      if (seenNdisInBatch.has(ndisDigitsOnly)) {
        issues.push({
          field: 'ndisNumber',
          fieldName: 'NDIS Number',
          message: `Duplicate NDIS number within this batch (Row ${seenNdisInBatch.get(ndisDigitsOnly)}).`,
          severity: 'error',
        });
      } else {
        seenNdisInBatch.set(ndisDigitsOnly, index + 1);
      }
    }

    // 3. Date of Birth Validation
    let formattedDob = rawDob.trim();
    if (!formattedDob) {
      issues.push({
        field: 'dateOfBirth',
        fieldName: 'Date of Birth',
        message: 'Missing Date of Birth. Required for NDIS participant identity and age brackets.',
        severity: 'error',
      });
    } else {
      // Check standard date formats (YYYY-MM-DD or DD/MM/YYYY)
      let parsedDate: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDob)) {
        parsedDate = new Date(formattedDob);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedDob)) {
        const [d, m, y] = formattedDob.split('/');
        formattedDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        parsedDate = new Date(formattedDob);
      } else {
        const d = new Date(formattedDob);
        if (!isNaN(d.getTime())) {
          formattedDob = d.toISOString().split('T')[0];
          parsedDate = d;
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        issues.push({
          field: 'dateOfBirth',
          fieldName: 'Date of Birth',
          message: `Malformed date format: "${rawDob}". Use YYYY-MM-DD or DD/MM/YYYY.`,
          severity: 'error',
        });
      } else if (parsedDate > new Date()) {
        issues.push({
          field: 'dateOfBirth',
          fieldName: 'Date of Birth',
          message: `Date of birth cannot be in the future (${formattedDob}).`,
          severity: 'error',
        });
      } else {
        const ageYears = (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (ageYears > 110) {
          issues.push({
            field: 'dateOfBirth',
            fieldName: 'Date of Birth',
            message: `Unrealistic date of birth (age > 110 years).`,
            severity: 'warning',
          });
        }
      }
    }

    // 4. Email validation (if provided)
    if (rawEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail.trim())) {
        issues.push({
          field: 'email',
          fieldName: 'Email Address',
          message: `Invalid email address format: "${rawEmail}".`,
          severity: 'error',
        });
      }
    }

    // 5. Phone validation (if provided)
    if (rawPhone.trim()) {
      const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        issues.push({
          field: 'phone',
          fieldName: 'Phone Number',
          message: `Phone number format may be invalid (${rawPhone}). Expected Australian mobile/landline.`,
          severity: 'warning',
        });
      }
    }

    // 6. Disability Validation
    if (!rawDisability.trim()) {
      issues.push({
        field: 'primaryDisability',
        fieldName: 'Primary Disability',
        message: 'No primary disability specified. Defaulting to "General Support & Behaviour Support".',
        severity: 'warning',
      });
    }

    // Determine row status & color
    const hasErrors = issues.some((i) => i.severity === 'error');
    const hasWarnings = issues.some((i) => i.severity === 'warning');

    const status: RowStatus = hasErrors ? 'ERROR' : hasWarnings ? 'WARNING' : 'VALID';
    const statusColor: 'red' | 'amber' | 'emerald' = hasErrors
      ? 'red'
      : hasWarnings
      ? 'amber'
      : 'emerald';

    // Parse status enum
    let normalizedStatus: 'Active' | 'Onboarding' | 'Archived' | 'Pending Plan' = 'Active';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower.includes('onboard')) normalizedStatus = 'Onboarding';
      else if (lower.includes('archive')) normalizedStatus = 'Archived';
      else if (lower.includes('pending')) normalizedStatus = 'Pending Plan';
    }

    // Parse plan management type
    let normalizedPlanType: 'Agency-Managed (NDIA)' | 'Plan-Managed' | 'Self-Managed' | 'NDIA-Managed' =
      'Plan-Managed';
    if (rawPlanType) {
      const lower = rawPlanType.toLowerCase();
      if (lower.includes('agency') || lower.includes('ndia')) normalizedPlanType = 'Agency-Managed (NDIA)';
      else if (lower.includes('self')) normalizedPlanType = 'Self-Managed';
    }

    // Parse total budget
    const numericBudget = parseFloat(rawBudget.replace(/[^0-9.]/g, '')) || 45000;

    // Parse risk level
    let normalizedRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    if (rawRisk) {
      const lower = rawRisk.toLowerCase();
      if (lower.includes('crit')) normalizedRisk = 'Critical';
      else if (lower.includes('high')) normalizedRisk = 'High';
      else if (lower.includes('low')) normalizedRisk = 'Low';
    }

    return {
      rowId: `imp-row-${index + 1}-${Date.now().toString().slice(-4)}`,
      rowIndex: index + 1,
      selected: !hasErrors,
      status,
      statusColor,
      issues,
      mapped: {
        name: nameTrimmed,
        ndisNumber: ndisDigitsOnly || rawNdis.trim(),
        dateOfBirth: formattedDob || '2000-01-01',
        email: rawEmail.trim(),
        phone: rawPhone.trim(),
        primaryDisability: rawDisability.trim() || 'General Disability & Behaviour Support',
        status: normalizedStatus,
        planManagementType: normalizedPlanType,
        totalBudget: numericBudget,
        emergencyContactName: rawEmergencyName.trim() || 'Parent/Guardian',
        emergencyContactPhone: rawEmergencyPhone.trim() || rawPhone.trim() || '0400 000 000',
        riskLevel: normalizedRisk,
        planStartDate: rawStartDate.trim() || new Date().toISOString().split('T')[0],
        planEndDate:
          rawEndDate.trim() ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      raw,
    };
  });

  const errorCount = validatedRows.filter((r) => r.status === 'ERROR').length;
  const warningCount = validatedRows.filter((r) => r.status === 'WARNING').length;
  const validCount = validatedRows.filter((r) => r.status === 'VALID').length;

  return {
    totalRows: validatedRows.length,
    errorCount,
    warningCount,
    validCount,
    rows: validatedRows,
  };
}

/**
 * Auto-sanitizes row formats (strips non-digits from NDIS, normalizes dates)
 */
export function autoSanitizeRow(row: ValidatedParticipantRow): ValidatedParticipantRow {
  const updatedMapped = { ...row.mapped };

  // 1. Sanitize NDIS Number: strip non-digits, ensure starts with 43 if 7 digits, or generate
  const cleanDigits = updatedMapped.ndisNumber.replace(/[^0-9]/g, '');
  if (cleanDigits.length === 9) {
    updatedMapped.ndisNumber = cleanDigits;
  } else if (cleanDigits.length === 7) {
    updatedMapped.ndisNumber = `43${cleanDigits}`;
  } else if (!cleanDigits || cleanDigits.length !== 9) {
    updatedMapped.ndisNumber = `43${Math.floor(1000000 + Math.random() * 9000000)}`;
  }

  // 2. Normalize DOB
  if (!updatedMapped.dateOfBirth || isNaN(new Date(updatedMapped.dateOfBirth).getTime())) {
    updatedMapped.dateOfBirth = '1998-05-15';
  } else if (new Date(updatedMapped.dateOfBirth) > new Date()) {
    updatedMapped.dateOfBirth = '2001-08-20';
  }

  // 3. Fallback name if missing
  if (!updatedMapped.name.trim()) {
    updatedMapped.name = `Participant #${row.rowIndex}`;
  }

  // 4. Sanitize email if invalid
  if (updatedMapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedMapped.email)) {
    const safeName = updatedMapped.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    updatedMapped.email = `${safeName}@participant.ndis.local`;
  }

  // Re-run validation on this single row
  const fakeRaw: Record<string, string> = {
    name: updatedMapped.name,
    ndisNumber: updatedMapped.ndisNumber,
    dateOfBirth: updatedMapped.dateOfBirth,
    email: updatedMapped.email,
    phone: updatedMapped.phone,
    primaryDisability: updatedMapped.primaryDisability,
    status: updatedMapped.status,
    planManagementType: updatedMapped.planManagementType,
    totalBudget: String(updatedMapped.totalBudget),
  };

  const recheck = preUploadValidationCheck(
    [fakeRaw],
    {
      name: 'name',
      ndisNumber: 'ndisNumber',
      dateOfBirth: 'dateOfBirth',
      email: 'email',
      phone: 'phone',
      primaryDisability: 'primaryDisability',
      status: 'status',
      planManagementType: 'planManagementType',
      totalBudget: 'totalBudget',
      emergencyContactName: '',
      emergencyContactPhone: '',
      riskLevel: '',
      planStartDate: '',
      planEndDate: '',
    }
  );

  const revalidated = recheck.rows[0];

  return {
    ...row,
    mapped: updatedMapped,
    issues: revalidated.issues,
    status: revalidated.status,
    statusColor: revalidated.statusColor,
    selected: revalidated.status !== 'ERROR',
  };
}

/**
 * Maps a validated row to the strict Firestore Client document schema
 */
export function mapToFirestoreClientSchema(
  validatedRow: ValidatedParticipantRow,
  options?: { practitionerId?: string; practitionerName?: string }
): Client {
  const m = validatedRow.mapped;
  const idSafe = (m.name || 'participant').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const uniqueId = `cli-${idSafe}-${Date.now().toString().slice(-4)}-${validatedRow.rowIndex}`;

  const goals: ClientGoal[] = [
    {
      id: `g-${uniqueId}-1`,
      title: `Capacity Building & Skill Acquisition Support for ${m.name || 'Participant'}`,
      category: 'Capacity Building',
      targetDate: m.planEndDate,
      progressPercent: 15,
      status: 'In Progress',
      gasScore: 0,
    },
  ];

  return {
    id: uniqueId,
    ndisNumber: m.ndisNumber,
    name: m.name,
    ...(m.email && m.email.trim() ? { email: m.email.trim() } : {}),
    ...(m.phone && m.phone.trim() ? { phone: m.phone.trim() } : {}),
    dateOfBirth: m.dateOfBirth,
    status: m.status,
    primaryDisability: m.primaryDisability,
    goals,
    planStartDate: m.planStartDate,
    planEndDate: m.planEndDate,
    planManagementType: m.planManagementType,
    totalBudget: m.totalBudget,
    allocatedBudget: Math.round(m.totalBudget * 0.8),
    spentBudget: 0,
    primaryPractitionerId: options?.practitionerId || 'staff-101',
    primaryPractitionerName: options?.practitionerName || 'Ben Rusic (Senior PBS Practitioner)',
    riskLevel: m.riskLevel,
    emergencyContact: {
      name: m.emergencyContactName,
      relation: 'Primary Contact',
      phone: m.emergencyContactPhone,
    },
    restrictivePracticesActive: false,
    isCustomUserParticipant: true,
    driveFolderPath: `Staff Share Drive > Participants > Behaviour Support > ${m.name}`,
    driveSubfolders: STANDARD_DRIVE_SUBFOLDERS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generates sample CSV data containing clean records along with rows having intentional
 * missing or malformed fields to demonstrate real-time red error highlighting and manual correction.
 */
export function generateSampleParticipantCSVWithErrors(): string {
  return `Participant Name,NDIS Number,Date of Birth,Disability,Email Address,Phone,Total Budget,Status
Marcus Vance,430987654,1995-04-12,Autism Spectrum Disorder,marcus.vance@example.com.au,0412 345 678,65000,Active
,430112233,1998-11-20,Cerebral Palsy,missing.name@ndis.org,0423 456 789,52000,Active
Sarah Jenkins,NDIS-4309988,2002-07-15,Down Syndrome,sarah.j@outlook.com,0434 567 890,48000,Active
Liam O'Connor,430554433,2035-12-01,Acquired Brain Injury,liam.oc@example.com,0445 678 901,72000,Onboarding
Chloe Zhang,430887766,1993-09-08,Psychosocial Disability,chloe-zhang-invalid-email,0456 789 012,38000,Active
Benjamin Thorne,430223344,1989-02-28,Spinal Cord Injury,ben.thorne@healthnet.com.au,0467 890 123,85000,Active`;
}
