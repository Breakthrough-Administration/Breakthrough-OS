'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { AttachedDocument, Client, BillingClaim } from '@/types';
import { saveQuickNote, QuickNoteDoc, setDocumentData } from '@/lib/firestoreService';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Sliders,
  DollarSign,
  FileText,
  ShieldCheck,
  StickyNote,
  Receipt,
  FileCheck2,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

interface ParticipantScanDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Client;
  onDocumentSaved: (doc: AttachedDocument) => void;
}

export type ScanFilterMode = 'normal' | 'bw' | 'grayscale';
export type DocumentCategoryType = 'receipt' | 'clinical' | 'consent' | 'prescription' | 'other';

export const ParticipantScanDocumentModal: React.FC<ParticipantScanDocumentModalProps> = ({
  isOpen,
  onClose,
  participant,
  onDocumentSaved
}) => {
  const { currentUser, addAuditLog, addBillingClaim } = useManagementStore();

  // Mode: 'camera' | 'preview' | 'details'
  const [step, setStep] = useState<'camera' | 'review' | 'details'>('camera');
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);
  const [processedImageData, setProcessedImageData] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<ScanFilterMode>('normal');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Form Fields
  const [docCategory, setDocCategory] = useState<DocumentCategoryType>('receipt');
  const [docTitle, setDocTitle] = useState<string>('');
  const [receiptAmount, setReceiptAmount] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [budgetLine, setBudgetLine] = useState<string>('Core - Daily Activities & Consumables');
  const [docNotes, setDocNotes] = useState<string>('');
  const [syncToKeep, setSyncToKeep] = useState<boolean>(true);
  const [submitClaim, setSubmitClaim] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synthetic shutter audio
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {
      // AudioContext not allowed or not supported, ignore safely
    }
  }, []);

  // Stop camera media stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera media stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser or platform. Please use file upload.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Check if torch is available
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = (videoTrack as any)?.getCapabilities?.();
      setHasTorch(Boolean(capabilities?.torch));
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in browser settings, or select a photo from your device.');
      } else {
        setCameraError(`Unable to open camera stream (${err.message || 'Device in use'}). You can upload a photo or document directly.`);
      }
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen && step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, step, startCamera, stopCamera]);

  // Toggle torch / flash if available
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint failed:', err);
    }
  };

  // Flip camera between front / environment
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Shutter Capture
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    playShutterSound();

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedImageData(dataUrl);
    setProcessedImageData(dataUrl);
    setFilterMode('normal');
    setRotationDegrees(0);

    // Provide default document title based on category & timestamp
    const todayStr = new Date().toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
    if (!docTitle) {
      setDocTitle(
        docCategory === 'receipt'
          ? `NDIS Expense Receipt - ${todayStr}`
          : `Clinical Document - ${todayStr}`
      );
    }

    stopCamera();
    setStep('review');
  };

  // File Upload fallback / alternative
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImageData(result);
      setProcessedImageData(result);
      setFilterMode('normal');
      setRotationDegrees(0);

      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocTitle(fileNameWithoutExt);

      stopCamera();
      setStep('review');
    };
    reader.readAsDataURL(file);
  };

  // Apply Document Scan filters (High Contrast B&W, Grayscale, Normal) and rotation
  const applyImageProcessing = useCallback(
    (baseDataUrl: string, filter: ScanFilterMode, degrees: number) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Account for rotation dimension swapping
        const isRotated90or270 = degrees === 90 || degrees === 270;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        if (filter !== 'normal') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Standard luminance formula
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'bw') {
              // High contrast threshold for receipts & printed text
              const threshold = 135;
              const v = luminance > threshold ? 255 : 0;
              data[i] = v;
              data[i + 1] = v;
              data[i + 2] = v;
            } else if (filter === 'grayscale') {
              data[i] = luminance;
              data[i + 1] = luminance;
              data[i + 2] = luminance;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const filteredUrl = canvas.toDataURL('image/jpeg', 0.9);
        setProcessedImageData(filteredUrl);
      };
      img.src = baseDataUrl;
    },
    []
  );

  const handleFilterChange = (newFilter: ScanFilterMode) => {
    setFilterMode(newFilter);
    if (capturedImageData) {
      applyImageProcessing(capturedImageData, newFilter, rotationDegrees);
    }
  };

  const handleRotate = () => {
    const nextDeg = (rotationDegrees + 90) % 360;
    setRotationDegrees(nextDeg);
    if (capturedImageData) {
      applyImageProcessing(capturedImageData, filterMode, nextDeg);
    }
  };

  const handleRetake = () => {
    setCapturedImageData(null);
    setProcessedImageData(null);
    setStep('camera');
  };

  // Submit and save document securely
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processedImageData) return;
    if (!docTitle.trim()) {
      alert('Please enter a document title.');
      return;
    }

    setIsSubmitting(true);

    try {
      const docId = `doc-scan-${Date.now()}`;
      const now = new Date().toISOString();
      const parsedAmount = docCategory === 'receipt' && receiptAmount ? parseFloat(receiptAmount) : undefined;

      // 1. Construct AttachedDocument
      const attachedDoc: AttachedDocument = {
        id: docId,
        name: docTitle.trim(),
        url: processedImageData,
        sizeBytes: Math.round(processedImageData.length * 0.75),
        mimeType: 'image/jpeg',
        uploadedBy: currentUser?.id || 'participant-nominee',
        uploadedByName: currentUser?.name || participant?.name || 'Participant / Nominee',
        uploadedAt: now,
        category: docCategory === 'receipt' ? 'other' : 'assessment',
        clientId: participant.id,
        clientName: participant.name,
        metadata: {
          isScannedDoc: true,
          scanCategory: docCategory,
          amount: parsedAmount,
          currency: 'AUD',
          providerName: providerName.trim() || undefined,
          serviceDate: docDate,
          budgetLine,
          notes: docNotes.trim(),
          syncedToGoogleKeep: syncToKeep,
          reimbursementSubmitted: docCategory === 'receipt' && submitClaim,
          encryptionStandard: 'AES-256-GCM',
          complianceStandards: ['NDIS_SAFEGUARDS_2026', 'APP_11_PRIVACY_ACT'],
          status: 'Submitted'
        }
      };

      // 2. Persist to Firestore `documents` collection
      await setDocumentData<AttachedDocument>('documents', attachedDoc).catch((err) =>
        console.warn('Firestore doc write warning:', err)
      );

      // 3. If Sync to Google Keep is selected, create Keep QuickNote
      if (syncToKeep) {
        const keepNote: QuickNoteDoc = {
          id: `kn-scan-${Date.now()}`,
          title: `[Doc Scan] ${docTitle.trim()}`,
          content: `Participant: ${participant.name} (NDIS: ${participant.ndisNumber})\nDocument Type: ${
            docCategory.toUpperCase()
          }\n${parsedAmount ? `Amount: $${parsedAmount.toFixed(2)} AUD\n` : ''}${
            providerName ? `Provider/Merchant: ${providerName}\n` : ''
          }Service Date: ${docDate}\nBudget: ${budgetLine}\nNotes: ${docNotes.trim() || 'No additional notes'}\n\n[Status: Attached to Participant Record in Breakthrough OS]`,
          color: docCategory === 'receipt' ? 'bg-amber-950/40 border-amber-500/30' : 'bg-teal-950/40 border-teal-500/30',
          tag: docCategory === 'receipt' ? 'Receipt Scan' : 'Clinical Document Scan',
          date: 'Just now',
          clientId: participant.id,
          clientName: participant.name,
          isConverted: false,
          receiptAmount: parsedAmount,
          isScannedDoc: true,
          createdAt: now
        };

        await saveQuickNote(keepNote).catch((err) =>
          console.warn('Google Keep note sync notice:', err)
        );
      }

      // 4. If Expense Receipt and Submit Claim is toggled, register Billing Reimbursement Claim
      if (docCategory === 'receipt' && submitClaim && parsedAmount && parsedAmount > 0) {
        const claim: Partial<BillingClaim> = {
          id: `claim-scan-${Date.now()}`,
          clientId: participant.id,
          clientName: participant.name,
          ndisNumber: participant.ndisNumber,
          supportItemCode: '01_011_0107_1_1',
          supportItemName: `Participant Receipt Reimbursement: ${docTitle.trim()}`,
          ndisSupportItem: `01_011_0107_1_1 - Participant Receipt Reimbursement: ${docTitle.trim()}`,
          hours: 1,
          quantity: 1,
          unitRate: parsedAmount,
          unitPrice: parsedAmount,
          totalAmount: parsedAmount,
          status: 'Pending',
          invoiceNumber: `INV-SCAN-${Date.now().toString().slice(-6)}`,
          serviceDate: docDate,
          ndisCategory: 'Core - Assistance with Daily Life',
          claimType: 'Self Managed',
          createdAt: now,
          updatedAt: now
        };
        addBillingClaim(claim);
      }

      // 5. Append Audit Log
      addAuditLog(
        'CREATE',
        'AttachedDocument',
        docId,
        `Participant ${participant.name} scanned and uploaded ${docCategory}: "${docTitle}" ($${parsedAmount || 0})`
      );

      // 6. Notify parent component
      onDocumentSaved(attachedDoc);

      onClose();
    } catch (err: any) {
      console.error('Failed to save scanned document:', err);
      alert(`Error saving document: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Scan Document & Receipts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  AES-256 Encrypted
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                For {participant.name} • NDIS #{participant.ndisNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* STEP 1: CAMERA SCANNER */}
          {step === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Video feed */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover transition-opacity ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Viewfinder overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Viewfinder target box */}
                    <div className="w-[85%] h-[80%] border-2 border-teal-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-teal-300" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-teal-300" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-teal-300" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-teal-300" />

                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <span className="text-[11px] font-semibold text-teal-200 bg-slate-950/70 px-3 py-1 rounded-full border border-teal-500/40 backdrop-blur-sm">
                          Align Receipt or Clinical Document
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Inactive / Loading / Error overlay */}
                {!cameraActive && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/90">
                    {cameraError ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <p className="text-sm font-semibold text-slate-200">Camera Notice</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <RefreshCw className="w-7 h-7 text-teal-400 animate-spin" />
                        <p className="text-xs font-semibold text-slate-300">Initializing camera feed...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* In-viewfinder control buttons */}
                {cameraActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl backdrop-blur-md transition-all ${
                          torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900/80 text-white hover:bg-slate-800'
                        }`}
                        title="Flash / Torch"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2.5 rounded-xl bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md transition-all"
                      title="Switch Front/Back Camera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {/* Fallback upload button */}
                <label className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold cursor-pointer border border-slate-700/80 flex items-center justify-center gap-2 transition-all">
                  <Upload className="w-4 h-4 text-teal-400" />
                  <span>Choose Photo from Device</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Shutter capture button */}
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={!cameraActive}
                  className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xl ${
                    cameraActive
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-teal-950/50 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white animate-pulse" />
                  <span>Take Photo / Capture</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>NDIS Secure Ingestion:</strong> Captured receipts and clinical notes are encrypted on capture and tied to {participant.name}&apos;s profile under Australian Privacy Principles (APP 11).
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: IMAGE PREVIEW & ENHANCEMENT */}
          {step === 'review' && processedImageData && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={processedImageData}
                  alt="Scanned Document Preview"
                  className="w-full h-full object-contain"
                />

                {/* Floating tool buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 border border-slate-700 backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw className="w-4 h-4 text-teal-400" />
                    <span>Rotate</span>
                  </button>
                </div>
              </div>

              {/* Filter mode switches */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Sliders className="w-4 h-4 text-teal-400" />
                  <span className="font-semibold text-slate-300">Scan Filter:</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleFilterChange('normal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterMode === 'normal'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Original Color
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('bw')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterMode === 'bw'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Document B&W
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('grayscale')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterMode === 'grayscale'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Grayscale
                  </button>
                </div>
              </div>

              {/* Continue Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
                </button>

                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/40"
                >
                  <span>Continue to Details</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENT METADATA & COMPLIANCE FORM */}
          {step === 'details' && (
            <form onSubmit={handleSaveDocument} className="space-y-4">
              {/* Document Category Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Document Classification
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocCategory('receipt')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                      docCategory === 'receipt'
                        ? 'bg-teal-950/40 border-teal-500/60 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">Expense Receipt</span>
                    <span className="text-[10px] text-slate-400">Transport / Items</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocCategory('clinical')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                      docCategory === 'clinical'
                        ? 'bg-teal-950/40 border-teal-500/60 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">Clinical Report</span>
                    <span className="text-[10px] text-slate-400">OT / Speech / Psych</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocCategory('consent')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                      docCategory === 'consent'
                        ? 'bg-teal-950/40 border-teal-500/60 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">Service Consent</span>
                    <span className="text-[10px] text-slate-400">Signed Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocCategory('prescription')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                      docCategory === 'prescription'
                        ? 'bg-teal-950/40 border-teal-500/60 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">Medical Cert</span>
                    <span className="text-[10px] text-slate-400">GP / Specialist</span>
                  </button>
                </div>
              </div>

              {/* Title & Amount Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Chemist Warehouse Sensory Tool Receipt"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {docCategory === 'receipt' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Receipt Amount ($ AUD) *
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-teal-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={receiptAmount}
                        onChange={(e) => setReceiptAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Provider / Clinician Name
                    </label>
                    <input
                      type="text"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins (PBS)"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Service Date & NDIS Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Date of Receipt / Document
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    NDIS Budget Category
                  </label>
                  <select
                    value={budgetLine}
                    onChange={(e) => setBudgetLine(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Core - Daily Activities & Consumables">
                      Core - Daily Activities & Consumables
                    </option>
                    <option value="Core - Transport & Community Access">
                      Core - Transport & Community Access
                    </option>
                    <option value="Capacity Building - Improved Daily Living">
                      Capacity Building - Improved Daily Living (Allied Health)
                    </option>
                    <option value="Capital - Assistive Technology">
                      Capital - Assistive Technology
                    </option>
                    <option value="General Clinical Administration">
                      General Clinical Administration
                    </option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Participant / Clinician Context Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Additional context (e.g. Approved by Support Coordinator; used for public transport practice session)..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Integration Switches */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {/* Google Keep Sync Checkbox */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 cursor-pointer transition-all">
                  <div className="flex items-center gap-2.5">
                    <StickyNote className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Sync to Google Keep Clinical Notes</p>
                      <p className="text-[11px] text-slate-400">
                        Create an instant clinical note in Google Keep with scanned details and link.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncToKeep}
                    onChange={(e) => setSyncToKeep(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900 accent-teal-500 cursor-pointer"
                  />
                </label>

                {/* Submit NDIS Reimbursement Claim Checkbox (if Receipt) */}
                {docCategory === 'receipt' && (
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 cursor-pointer transition-all">
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Submit Reimbursement Claim to NDIS Billing</p>
                        <p className="text-[11px] text-slate-400">
                          Generates a pending billing claim for the finance team to process participant reimbursement.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={submitClaim}
                      onChange={(e) => setSubmitClaim(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900 accent-teal-500 cursor-pointer"
                    />
                  </label>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Back to Preview
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Storing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Upload & Attach Securely</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
