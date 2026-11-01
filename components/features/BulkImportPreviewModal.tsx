'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  parseParticipantCSV,
  autoDetectFieldMappings,
  preUploadValidationCheck,
  autoSanitizeRow,
  mapToFirestoreClientSchema,
  generateSampleParticipantCSVWithErrors,
  ValidatedParticipantRow,
  ImportValidationResult,
  ParticipantFieldMapping,
} from '@/services/hrParticipantImportService';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Upload,
  RefreshCw,
  Sparkles,
  X,
  Search,
  Check,
  Edit2,
  Database,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Download,
} from 'lucide-react';

export interface BulkImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (importedCount: number) => void;
  initialCsvText?: string;
}

export const BulkImportPreviewModal: React.FC<BulkImportPreviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCsvText,
}) => {
  const { clients, batchImportValidatedClients, currentUser } = useManagementStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw and mapped state
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('sample_ndis_participants.csv');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<ParticipantFieldMapping>({
    name: '',
    ndisNumber: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    primaryDisability: '',
    status: '',
    planManagementType: '',
    totalBudget: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    riskLevel: '',
    planStartDate: '',
    planEndDate: '',
  });

  // Validated rows
  const [validatedData, setValidatedData] = useState<ImportValidationResult>({
    totalRows: 0,
    errorCount: 0,
    warningCount: 0,
    validCount: 0,
    rows: [],
  });

  // UI state
  const [filterTab, setFilterTab] = useState<'all' | 'errors' | 'warnings' | 'valid'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: 'name' | 'ndisNumber' | 'dateOfBirth' | 'email' | 'phone' | 'primaryDisability' | 'totalBudget';
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitProgress, setCommitProgress] = useState<number>(0);
  const [commitResult, setCommitResult] = useState<{ count: number; error?: string } | null>(null);
  const [showErrorCommitWarning, setShowErrorCommitWarning] = useState<boolean>(false);

  // Initialize or reload data
  const processCSVText = (text: string, sourceName = 'uploaded_participants.csv') => {
    setCsvContent(text);
    setFileName(sourceName);
    const parsed = parseParticipantCSV(text);
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);

    const mapping = autoDetectFieldMappings(parsed.headers);
    setFieldMapping(mapping);

    const validated = preUploadValidationCheck(parsed.rows, mapping, clients);
    setValidatedData(validated);
    setCommitResult(null);
  };

  // Load sample dataset on modal open if no initial CSV provided
  useEffect(() => {
    if (isOpen) {
      if (initialCsvText) {
        processCSVText(initialCsvText, 'custom_import.csv');
      } else if (!csvContent) {
        const sample = generateSampleParticipantCSVWithErrors();
        processCSVText(sample, 'sample_ndis_participants.csv');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCsvText]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processCSVText(text, file.name);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-select same file if needed
    e.target.value = '';
  };

  // Toggle selection for a row
  const toggleRowSelect = (rowId: string) => {
    setValidatedData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r)),
    }));
  };

  // Toggle selection for all visible rows
  const toggleSelectAll = (select: boolean) => {
    setValidatedData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => ({ ...r, selected: select })),
    }));
  };

  // Inline cell edit save and re-validation
  const handleSaveCellEdit = (rowId: string) => {
    if (!editingCell) return;

    setValidatedData((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (row.rowId !== rowId) return row;

        const updatedMapped = { ...row.mapped };
        if (editingCell.field === 'totalBudget') {
          updatedMapped.totalBudget = parseFloat(editValue.replace(/[^0-9.]/g, '')) || 0;
        } else {
          (updatedMapped as Record<string, any>)[editingCell.field] = editValue.trim();
        }

        // Re-validate row against Firestore schema
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
          },
          clients
        );

        const newRow = recheck.rows[0];
        return {
          ...row,
          mapped: updatedMapped,
          issues: newRow.issues,
          status: newRow.status,
          statusColor: newRow.statusColor,
          selected: newRow.status !== 'ERROR',
        };
      });

      const errorCount = updatedRows.filter((r) => r.status === 'ERROR').length;
      const warningCount = updatedRows.filter((r) => r.status === 'WARNING').length;
      const validCount = updatedRows.filter((r) => r.status === 'VALID').length;

      return {
        ...prev,
        errorCount,
        warningCount,
        validCount,
        rows: updatedRows,
      };
    });

    setEditingCell(null);
  };

  // Auto-sanitize all rows
  const handleAutoSanitizeAll = () => {
    setValidatedData((prev) => {
      const sanitizedRows = prev.rows.map((row) => autoSanitizeRow(row));
      const errorCount = sanitizedRows.filter((r) => r.status === 'ERROR').length;
      const warningCount = sanitizedRows.filter((r) => r.status === 'WARNING').length;
      const validCount = sanitizedRows.filter((r) => r.status === 'VALID').length;

      return {
        ...prev,
        errorCount,
        warningCount,
        validCount,
        rows: sanitizedRows,
      };
    });
  };

  // Auto-sanitize single row
  const handleAutoSanitizeRow = (rowId: string) => {
    setValidatedData((prev) => {
      const updatedRows = prev.rows.map((r) => (r.rowId === rowId ? autoSanitizeRow(r) : r));
      const errorCount = updatedRows.filter((r) => r.status === 'ERROR').length;
      const warningCount = updatedRows.filter((r) => r.status === 'WARNING').length;
      const validCount = updatedRows.filter((r) => r.status === 'VALID').length;

      return {
        ...prev,
        errorCount,
        warningCount,
        validCount,
        rows: updatedRows,
      };
    });
  };

  // Exclude rows with errors from commit
  const handleExcludeRedRows = () => {
    setValidatedData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.status === 'ERROR' ? { ...r, selected: false } : r)),
    }));
  };

  // Commit selected participants to Firestore
  const executeCommitToFirestore = async (rowsToCommit: ValidatedParticipantRow[]) => {
    if (rowsToCommit.length === 0) return;

    setIsCommitting(true);
    setCommitProgress(20);

    try {
      // Map to Firestore Client schema
      const clientEntities = rowsToCommit.map((row) =>
        mapToFirestoreClientSchema(row, {
          practitionerId: currentUser?.id || 'staff-system',
          practitionerName: currentUser?.name || 'Clinical Practitioner',
        })
      );

      setCommitProgress(50);

      // Perform store batch import into Firestore
      const res = await batchImportValidatedClients(clientEntities);

      setCommitProgress(100);
      setIsCommitting(false);

      if (res.success) {
        setCommitResult({ count: res.count });
        if (onSuccess) {
          onSuccess(res.count);
        }
      } else {
        setCommitResult({ count: 0, error: res.error || 'Failed to commit batch to Firestore.' });
      }
    } catch (err: any) {
      setIsCommitting(false);
      setCommitResult({ count: 0, error: err?.message || 'Unexpected Firestore error.' });
    }
  };

  // Pre-commit validation trigger
  const handleCommitClick = () => {
    const selectedRows = validatedData.rows.filter((r) => r.selected);
    if (selectedRows.length === 0) return;

    const hasRedRowsSelected = selectedRows.some((r) => r.status === 'ERROR');
    if (hasRedRowsSelected) {
      setShowErrorCommitWarning(true);
      return;
    }

    executeCommitToFirestore(selectedRows);
  };

  // Filtered rows for data table
  const displayedRows = useMemo(() => {
    return validatedData.rows.filter((row) => {
      // Tab filter
      if (filterTab === 'errors' && row.status !== 'ERROR') return false;
      if (filterTab === 'warnings' && row.status !== 'WARNING') return false;
      if (filterTab === 'valid' && row.status !== 'VALID') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.mapped.name.toLowerCase().includes(q);
        const matchesNdis = row.mapped.ndisNumber.toLowerCase().includes(q);
        const matchesEmail = row.mapped.email.toLowerCase().includes(q);
        const matchesDisability = row.mapped.primaryDisability.toLowerCase().includes(q);
        return matchesName || matchesNdis || matchesEmail || matchesDisability;
      }

      return true;
    });
  }, [validatedData.rows, filterTab, searchQuery]);

  const selectedCount = validatedData.rows.filter((r) => r.selected).length;
  const selectedRedCount = validatedData.rows.filter((r) => r.selected && r.status === 'ERROR').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,text/csv"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Bulk Import Preview</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
                  Pre-Upload Validator
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
                  {fileName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect parsed participant records. Color-coded status indicators highlight missing or malformed fields requiring manual data correction before saving to Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
              title="Upload custom CSV participant file"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => {
                const sample = generateSampleParticipantCSVWithErrors();
                processCSVText(sample, 'sample_ndis_participants.csv');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
              title="Reload sample test dataset with intentional errors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reset Sample</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Metrics Status Bar */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-medium">
              <span>Total Rows:</span>
              <span className="font-extrabold text-white text-sm">{validatedData.totalRows}</span>
            </div>

            {/* Red Error Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                filterTab === 'errors'
                  ? 'bg-rose-500/25 border-rose-500 text-rose-200 shadow-md shadow-rose-950/40'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              }`}
              onClick={() => setFilterTab(filterTab === 'errors' ? 'all' : 'errors')}
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Requires Manual Correction:</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 font-extrabold">
                {validatedData.errorCount}
              </span>
            </div>

            {/* Amber Warning Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                filterTab === 'warnings'
                  ? 'bg-amber-500/25 border-amber-500 text-amber-200 shadow-md shadow-amber-950/40'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              onClick={() => setFilterTab(filterTab === 'warnings' ? 'all' : 'warnings')}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Warnings:</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-extrabold">
                {validatedData.warningCount}
              </span>
            </div>

            {/* Emerald Valid Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                filterTab === 'valid'
                  ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              onClick={() => setFilterTab(filterTab === 'valid' ? 'all' : 'valid')}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to Save:</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-extrabold">
                {validatedData.validCount}
              </span>
            </div>
          </div>

          {/* Quick Repair & Auto-Sanitize actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSanitizeAll}
              className="px-3 py-1.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 font-bold border border-teal-500/40 flex items-center gap-1.5 transition-colors"
              title="Automatically standardize formats, strip non-digits from NDIS numbers, and repair dates"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Sanitize Formats</span>
            </button>
            {validatedData.errorCount > 0 && (
              <button
                onClick={handleExcludeRedRows}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors"
                title="Uncheck all rows highlighted in red"
              >
                Exclude Red Rows
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Rows ({validatedData.totalRows})
            </button>
            <button
              onClick={() => setFilterTab('errors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'errors'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Needs Correction ({validatedData.errorCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('warnings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'warnings'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({validatedData.warningCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('valid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'valid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready ({validatedData.validCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, NDIS, email..."
                className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-56"
              />
            </div>
            <button
              onClick={() => toggleSelectAll(true)}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => toggleSelectAll(false)}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Highlighted Warning Banner if Errors Exist */}
        {validatedData.errorCount > 0 && (
          <div className="p-4 mx-6 mt-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 flex items-start justify-between gap-3 text-xs shadow-lg shadow-rose-950/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <span>{validatedData.errorCount} Participant Row{validatedData.errorCount > 1 ? 's' : ''} Require Manual Correction</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold tracking-wide">
                    Highlighted in Red Below
                  </span>
                </h4>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  Missing participant names, alphabetical characters in NDIS numbers, or future dates are highlighted in red.
                  <strong> Click any cell to correct data inline</strong>, or use the <strong>Auto-Sanitize</strong> button to clean up common formatting issues.
                </p>
              </div>
            </div>
            <button
              onClick={handleAutoSanitizeAll}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Sanitize Formats</span>
            </button>
          </div>
        )}

        {/* Success Confirmation Modal Overlay */}
        {commitResult && (
          <div className="p-8 mx-6 my-4 rounded-2xl bg-slate-950 border border-teal-500/50 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
            {commitResult.count > 0 ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {commitResult.count} Participants Successfully Saved to Firestore
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    All validated records and initial NDIS goals have been committed in a Firestore batch transaction.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-900/30"
                  >
                    Done & View Clients
                  </button>
                  <button
                    onClick={() => setCommitResult(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                  >
                    Import Another File
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Firestore Batch Commit Failed</h3>
                  <p className="text-xs text-rose-300 mt-1">{commitResult.error}</p>
                </div>
                <button
                  onClick={() => setCommitResult(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Return to Table
                </button>
              </>
            )}
          </div>
        )}

        {/* Responsive Parsed Data Table */}
        {!commitResult && (
          <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
            <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950/60">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-20 backdrop-blur-md border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={displayedRows.length > 0 && displayedRows.every((r) => r.selected)}
                          onChange={(e) => {
                            const check = e.target.checked;
                            setValidatedData((prev) => ({
                              ...prev,
                              rows: prev.rows.map((r) =>
                                displayedRows.some((dr) => dr.rowId === r.rowId)
                                  ? { ...r, selected: check }
                                  : r
                              ),
                            }));
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500"
                        />
                      </th>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-44">Status Indicator</th>
                      <th className="p-3 min-w-[170px]">Participant Name</th>
                      <th className="p-3 min-w-[140px]">NDIS Number</th>
                      <th className="p-3 min-w-[120px]">Date of Birth</th>
                      <th className="p-3 min-w-[180px]">Email Address</th>
                      <th className="p-3 min-w-[160px]">Primary Disability</th>
                      <th className="p-3 min-w-[100px]">Budget</th>
                      <th className="p-3 min-w-[240px]">Pre-Upload Validation Findings</th>
                      <th className="p-3 w-28 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          No participant records matching your current filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const isRed = row.status === 'ERROR';
                        const isAmber = row.status === 'WARNING';
                        const isEmerald = row.status === 'VALID';

                        // Specific field errors
                        const nameIssue = row.issues.find((i) => i.field === 'name');
                        const ndisIssue = row.issues.find((i) => i.field === 'ndisNumber');
                        const dobIssue = row.issues.find((i) => i.field === 'dateOfBirth');
                        const emailIssue = row.issues.find((i) => i.field === 'email');

                        return (
                          <tr
                            key={row.rowId}
                            className={`transition-colors border-b border-slate-800/80 ${
                              isRed
                                ? 'bg-rose-950/45 hover:bg-rose-950/65 border-l-4 border-l-rose-500 text-rose-50'
                                : isAmber
                                ? 'bg-amber-950/15 hover:bg-amber-950/25 border-l-4 border-l-amber-500/70'
                                : 'hover:bg-slate-800/40 border-l-4 border-l-emerald-500/50'
                            }`}
                          >
                            {/* Row Checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => toggleRowSelect(row.rowId)}
                                className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500"
                              />
                            </td>

                            {/* Row Index */}
                            <td className="p-3 text-center font-mono text-slate-400">
                              {row.rowIndex}
                            </td>

                            {/* Color-Coded Status Indicator */}
                            <td className="p-3 whitespace-nowrap">
                              {isRed ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-rose-600/30 text-rose-200 font-extrabold border border-rose-500/60 shadow-sm shadow-rose-950/50">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 animate-pulse" />
                                  <span>Requires Correction</span>
                                </span>
                              ) : isAmber ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  <span>Warning</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <span>Ready to Save</span>
                                </span>
                              )}
                            </td>

                            {/* Participant Name (Click to Edit, Red badge if error) */}
                            <td
                              className={`p-3 font-semibold ${
                                nameIssue?.severity === 'error' ? 'bg-rose-950/30 text-rose-200' : 'text-white'
                              }`}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'name' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                    onBlur={() => handleSaveCellEdit(row.rowId)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(row.rowId)}
                                    className="w-full px-2 py-1 bg-slate-900 border border-teal-500 rounded text-xs text-white focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ rowId: row.rowId, field: 'name' });
                                    setEditValue(row.mapped.name);
                                  }}
                                  className="cursor-pointer group flex items-center justify-between"
                                  title="Click to manually edit name"
                                >
                                  {nameIssue?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-500/50 font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.name || '[Missing Full Name]'}</span>
                                    </span>
                                  ) : (
                                    <span className="group-hover:text-teal-300 transition-colors">
                                      {row.mapped.name}
                                    </span>
                                  )}
                                  <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all ml-1.5" />
                                </div>
                              )}
                            </td>

                            {/* NDIS Number (Click to Edit, Red if non-numeric/invalid length) */}
                            <td
                              className={`p-3 font-mono ${
                                ndisIssue?.severity === 'error'
                                  ? 'bg-rose-950/30 text-rose-200 font-bold'
                                  : ndisIssue?.severity === 'warning'
                                  ? 'bg-amber-950/20 text-amber-300'
                                  : 'text-teal-300'
                              }`}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'ndisNumber' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                  onBlur={() => handleSaveCellEdit(row.rowId)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(row.rowId)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-teal-500 rounded text-xs font-mono text-white focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ rowId: row.rowId, field: 'ndisNumber' });
                                    setEditValue(row.mapped.ndisNumber);
                                  }}
                                  className="cursor-pointer group flex items-center justify-between"
                                  title="Click to manually edit NDIS number"
                                >
                                  {ndisIssue?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-500/50 font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.ndisNumber || '[Missing NDIS]'}</span>
                                    </span>
                                  ) : ndisIssue?.severity === 'warning' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                      <span>{row.mapped.ndisNumber}</span>
                                    </span>
                                  ) : (
                                    <span className="group-hover:text-teal-200 transition-colors">
                                      {row.mapped.ndisNumber}
                                    </span>
                                  )}
                                  <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all ml-1.5" />
                                </div>
                              )}
                            </td>

                            {/* Date of Birth (Click to Edit, Red if future or malformed) */}
                            <td
                              className={`p-3 font-mono whitespace-nowrap ${
                                dobIssue?.severity === 'error'
                                  ? 'bg-rose-950/30 text-rose-200 font-bold'
                                  : dobIssue?.severity === 'warning'
                                  ? 'bg-amber-950/20 text-amber-300'
                                  : 'text-slate-300'
                              }`}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'dateOfBirth' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  autoFocus
                                  onBlur={() => handleSaveCellEdit(row.rowId)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(row.rowId)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-teal-500 rounded text-xs font-mono text-white focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ rowId: row.rowId, field: 'dateOfBirth' });
                                    setEditValue(row.mapped.dateOfBirth);
                                  }}
                                  className="cursor-pointer group flex items-center justify-between"
                                  title="Click to edit DOB"
                                >
                                  {dobIssue?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-500/50 font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.dateOfBirth || '[Invalid DOB]'}</span>
                                    </span>
                                  ) : (
                                    <span className="group-hover:text-teal-200 transition-colors">
                                      {row.mapped.dateOfBirth}
                                    </span>
                                  )}
                                  <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all ml-1.5" />
                                </div>
                              )}
                            </td>

                            {/* Email Address */}
                            <td
                              className={`p-3 ${
                                emailIssue?.severity === 'error' ? 'bg-rose-950/30 text-rose-200' : 'text-slate-300'
                              }`}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'email' ? (
                                <input
                                  type="email"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                  onBlur={() => handleSaveCellEdit(row.rowId)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(row.rowId)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-teal-500 rounded text-xs text-white focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ rowId: row.rowId, field: 'email' });
                                    setEditValue(row.mapped.email);
                                  }}
                                  className="cursor-pointer group flex items-center justify-between truncate max-w-[200px]"
                                  title="Click to edit email"
                                >
                                  {emailIssue?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-200 border border-rose-500/50 font-semibold truncate">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.email || '[Invalid Email]'}</span>
                                    </span>
                                  ) : (
                                    <span className="truncate group-hover:text-teal-200">
                                      {row.mapped.email || <em className="text-slate-600 font-normal">None</em>}
                                    </span>
                                  )}
                                  <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all ml-1.5" />
                                </div>
                              )}
                            </td>

                            {/* Primary Disability */}
                            <td className="p-3 text-slate-300">
                              <span className="truncate max-w-[160px] inline-block">
                                {row.mapped.primaryDisability}
                              </span>
                            </td>

                            {/* Budget */}
                            <td className="p-3 font-mono text-slate-200">
                              ${row.mapped.totalBudget.toLocaleString()}
                            </td>

                            {/* Pre-Upload Validation Findings */}
                            <td className="p-3">
                              {row.issues.length === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                  <Check className="w-3 h-3" />
                                  <span>Schema Valid & Compliant</span>
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {row.issues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className={`text-[11px] flex items-start gap-1.5 leading-tight ${
                                        issue.severity === 'error' ? 'text-rose-300 font-medium' : 'text-amber-300'
                                      }`}
                                    >
                                      {issue.severity === 'error' ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      <span>{issue.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Quick Action Button */}
                            <td className="p-3 text-right whitespace-nowrap">
                              {isRed || isAmber ? (
                                <button
                                  onClick={() => handleAutoSanitizeRow(row.rowId)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30 transition-colors flex items-center gap-1 ml-auto"
                                  title="Quick sanitize this row"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Fix</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono">OK</span>
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
          </div>
        )}

        {/* Guard Dialog: Trying to commit with Red errors selected */}
        {showErrorCommitWarning && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manual Data Correction Required</h3>
                  <p className="text-xs text-rose-300 mt-1">
                    {selectedRedCount} of your selected rows still contain malformed or missing fields (highlighted in red).
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Saving uncorrected rows may cause PRODA PACE claim rejections or corrupted participant records in Firestore.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    setShowErrorCommitWarning(false);
                    handleAutoSanitizeAll();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Sanitize Formats & Proceed</span>
                </button>

                <button
                  onClick={() => {
                    setShowErrorCommitWarning(false);
                    const validOnly = validatedData.rows.filter(
                      (r) => r.selected && r.status !== 'ERROR'
                    );
                    executeCommitToFirestore(validOnly);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Exclude Red Rows & Commit Only Valid ({validatedData.validCount})</span>
                </button>

                <button
                  onClick={() => setShowErrorCommitWarning(false)}
                  className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel & Review Rows in Table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!commitResult && (
          <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>
                Selected for Firestore Batch: <strong className="text-white">{selectedCount}</strong> / {validatedData.totalRows}
              </span>
              {selectedRedCount > 0 && (
                <span className="text-rose-400 font-bold">
                  ({selectedRedCount} need manual correction)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleCommitClick}
                disabled={selectedCount === 0 || isCommitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                  selectedCount === 0 || isCommitting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : selectedRedCount > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/40'
                }`}
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing to Firestore ({commitProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>
                      Save {selectedCount} Participant{selectedCount === 1 ? '' : 's'} to Firestore
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
