/**
 * Google Drive Recursive Directory Sync & Classification Service
 * Handles full folder tree traversal, Gemini classification pipeline,
 * participant profile mapping, and real-time per-file activity logging.
 */

import { Client, AttachedDocument, DocumentCategory } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import {
  expandGoogleDriveFolderRecursively,
  PickedGoogleDriveFile,
} from '@/lib/googlePicker';
import {
  assessDocumentLocally,
  assessDocumentWithAI,
  commitDocumentAssessment,
  DocumentAssessment,
  DroppedDocumentItem,
} from './documentAssessmentService';

export interface FolderSyncLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  filePath: string;
  stage: 'discovered' | 'scanning' | 'classifying' | 'mapped' | 'unmatchable' | 'committed' | 'error';
  message: string;
  confidence?: number;
  targetParticipantName?: string;
  targetSubfolder?: string;
  error?: string;
}

export interface FolderSyncProgress {
  phase: 'idle' | 'traversing' | 'classifying' | 'ready_for_review' | 'committing' | 'completed' | 'error';
  totalDiscovered: number;
  processedCount: number;
  percent: number;
  currentFileName?: string;
  currentFolder?: string;
}

export interface FolderSyncResult {
  success: boolean;
  totalFiles: number;
  mappedCount: number;
  unmatchableCount: number;
  assessments: DocumentAssessment[];
  logs: FolderSyncLogEntry[];
  error?: string;
}

/**
 * Initiates recursive directory scanning and AI analysis pipeline across a Google Drive folder
 */
export async function scanAndClassifyDriveFolder(options: {
  folderId: string;
  folderPath: string;
  accessToken: string;
  participants: Client[];
  onProgress?: (progress: FolderSyncProgress) => void;
  onLog?: (log: FolderSyncLogEntry) => void;
}): Promise<FolderSyncResult> {
  const { folderId, folderPath, accessToken, participants, onProgress, onLog } = options;

  const logs: FolderSyncLogEntry[] = [];
  const addLog = (
    fileName: string,
    filePath: string,
    stage: FolderSyncLogEntry['stage'],
    message: string,
    extra?: Partial<FolderSyncLogEntry>
  ) => {
    const entry: FolderSyncLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('en-AU', { hour12: false }),
      fileName,
      filePath,
      stage,
      message,
      ...extra,
    };
    logs.push(entry);
    if (onLog) onLog(entry);
  };

  try {
    // 1. Recursive Directory Traversal
    if (onProgress) {
      onProgress({
        phase: 'traversing',
        totalDiscovered: 0,
        processedCount: 0,
        percent: 10,
        currentFolder: folderPath || 'Root Folder',
      });
    }

    addLog(
      'Directory Scan',
      folderPath || '/',
      'scanning',
      `Starting recursive scan of Google Drive folder: ${folderPath || folderId}`
    );

    const discoveredFiles = await expandGoogleDriveFolderRecursively(
      folderId,
      folderPath || 'Drive Folder',
      accessToken
    );

    addLog(
      'Traversal Complete',
      folderPath || '/',
      'discovered',
      `Discovered ${discoveredFiles.length} file(s) across directory tree.`
    );

    if (discoveredFiles.length === 0) {
      if (onProgress) {
        onProgress({
          phase: 'completed',
          totalDiscovered: 0,
          processedCount: 0,
          percent: 100,
        });
      }
      return {
        success: true,
        totalFiles: 0,
        mappedCount: 0,
        unmatchableCount: 0,
        assessments: [],
        logs,
      };
    }

    // 2. Document Classification & Metadata Extraction Pipeline
    const assessments: DocumentAssessment[] = [];
    let processed = 0;

    if (onProgress) {
      onProgress({
        phase: 'classifying',
        totalDiscovered: discoveredFiles.length,
        processedCount: 0,
        percent: 25,
      });
    }

    for (const file of discoveredFiles) {
      processed++;
      const currentPercent = Math.min(
        90,
        Math.round(25 + (processed / discoveredFiles.length) * 65)
      );

      if (onProgress) {
        onProgress({
          phase: 'classifying',
          totalDiscovered: discoveredFiles.length,
          processedCount: processed,
          percent: currentPercent,
          currentFileName: file.name,
        });
      }

      addLog(
        file.name,
        file.path || file.name,
        'classifying',
        `Analyzing document patterns and clinical metadata with Gemini...`
      );

      const item: DroppedDocumentItem = {
        id: file.id,
        name: file.name,
        path: file.path || file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes || 102400,
        googleDriveId: file.id,
        googleDriveUrl: file.url,
      };

      // Run AI assessment with local heuristic fallback
      const assessed = await assessDocumentWithAI(item, participants);
      assessments.push(assessed);

      const isUnmatchable =
        !assessed.targetParticipantId &&
        (!assessed.targetParticipantName ||
          assessed.targetParticipantName === 'Unassigned (Select Participant)') &&
        assessed.confidence < 50;

      if (isUnmatchable) {
        addLog(
          file.name,
          file.path || file.name,
          'unmatchable',
          `Flagged for manual review (Confidence: ${assessed.confidence}%). No strong participant match found.`,
          {
            confidence: assessed.confidence,
            targetSubfolder: assessed.targetSubfolder,
          }
        );
      } else {
        addLog(
          file.name,
          file.path || file.name,
          'mapped',
          `Mapped to "${assessed.targetParticipantName}" > [${assessed.targetSubfolder}] (Confidence: ${assessed.confidence}%)`,
          {
            confidence: assessed.confidence,
            targetParticipantName: assessed.targetParticipantName,
            targetSubfolder: assessed.targetSubfolder,
          }
        );
      }
    }

    const mappedCount = assessments.filter(
      (a) => a.targetParticipantId || (a.targetParticipantName && a.targetParticipantName !== 'Unassigned (Select Participant)')
    ).length;
    const unmatchableCount = assessments.length - mappedCount;

    if (onProgress) {
      onProgress({
        phase: 'ready_for_review',
        totalDiscovered: discoveredFiles.length,
        processedCount: discoveredFiles.length,
        percent: 100,
      });
    }

    addLog(
      'Batch Analysis Finished',
      folderPath || '/',
      'mapped',
      `Analysis completed: ${mappedCount} auto-mapped, ${unmatchableCount} flagged for review.`
    );

    return {
      success: true,
      totalFiles: discoveredFiles.length,
      mappedCount,
      unmatchableCount,
      assessments,
      logs,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Folder scan and classification failed';
    addLog('Scan Failure', folderPath || '/', 'error', errorMsg, { error: errorMsg });
    if (onProgress) {
      onProgress({
        phase: 'error',
        totalDiscovered: 0,
        processedCount: 0,
        percent: 0,
      });
    }
    return {
      success: false,
      totalFiles: 0,
      mappedCount: 0,
      unmatchableCount: 0,
      assessments: [],
      logs,
      error: errorMsg,
    };
  }
}
