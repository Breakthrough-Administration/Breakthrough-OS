import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.info('[CRM Referral Webhook] Ingesting external referral payload:', rawBody);

    const prospectName =
      rawBody.prospectName ||
      rawBody.participantName ||
      rawBody.clientName ||
      rawBody.name ||
      rawBody.fullName ||
      'New Participant Inquiry';

    const ndisNumber =
      rawBody.ndisNumber ||
      rawBody.ndisParticipantNumber ||
      rawBody.participantId ||
      '';

    const contactName =
      rawBody.contactName ||
      rawBody.referrerName ||
      rawBody.coordinatorName ||
      rawBody.guardianName ||
      prospectName;

    const contactEmail =
      rawBody.contactEmail ||
      rawBody.email ||
      rawBody.referrerEmail ||
      '';

    const contactPhone =
      rawBody.contactPhone ||
      rawBody.phone ||
      rawBody.referrerPhone ||
      '';

    const supportNeeds =
      rawBody.supportNeeds ||
      rawBody.primaryDisability ||
      rawBody.requestedService ||
      rawBody.services ||
      'Positive Behaviour Support & Functional Assessment';

    const fundingType =
      rawBody.fundingType ||
      rawBody.planManagement ||
      'NDIS Plan-Managed';

    const estimatedPlanValue =
      Number(rawBody.estimatedPlanValue || rawBody.budget || 24500);

    const source =
      rawBody.source ||
      rawBody.referralSource ||
      'External Website Referral Form';

    const notes =
      rawBody.notes ||
      rawBody.comments ||
      rawBody.message ||
      rawBody.clinicalSummary ||
      'Intake ingested automatically via external CRM webhook.';

    const now = new Date().toISOString();
    const leadId = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newLeadData = {
      id: leadId,
      prospectName,
      name: prospectName,
      ndisNumber,
      contactName,
      contactEmail,
      email: contactEmail,
      contactPhone,
      phone: contactPhone,
      stage: 'New Intake',
      status: 'New Inquiry',
      source,
      estimatedPlanValue,
      supportNeeds,
      fundingType,
      notes,
      assignedPractitionerName: 'Marcus Vance, Lead Intake Specialist',
      createdAt: now,
      updatedAt: now
    };

    // Store into Firestore crmLeads collection via adminDb
    try {
      await adminDb.collection('crmLeads').doc(leadId).set(newLeadData);
      console.info(`[CRM Webhook] Successfully persisted lead ${leadId} into Firestore crmLeads.`);

      const auditId = `audit-${Date.now()}`;
      await adminDb.collection('auditLogs').doc(auditId).set({
        id: auditId,
        action: 'EXTERNAL_CRM_LEAD_INGESTED',
        entity: 'crmLeads',
        entityId: leadId,
        user: 'CRM Webhook Ingestion Engine',
        timestamp: now,
        details: `External referral ingested for ${prospectName} (${source}) with estimated value $${estimatedPlanValue.toLocaleString()}`
      });
    } catch (dbErr) {
      console.warn('[CRM Webhook] Firestore admin write warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Referral lead ingested successfully for ${prospectName}`,
      leadId,
      lead: newLeadData
    }, { status: 201 });
  } catch (err: any) {
    console.error('[CRM Webhook] Error processing referral webhook:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/crm',
    supportedSources: [
      'HubSpot CRM',
      '17hats Business Platform',
      'Typeform Intake Survey',
      'Jotform NDIS Referral',
      'Direct Webflow/WordPress Webhook'
    ]
  });
}
