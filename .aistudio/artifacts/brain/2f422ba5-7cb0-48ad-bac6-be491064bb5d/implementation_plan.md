# Implementation Plan: Full Active Roster (22 Participants), Company Document Library, Practitioner Caseload Assignment & Practice Operations Suite

## 1. Executive Summary
This plan upgrades the Breakthrough NDIS Practice Management platform into a complete operating system for running your company:
1. **Activate All 22 NDIS Participants**: Promotes all 18 previously `'Onboarding'` participants to `'Active'` status across the application seed state, Zustand store, and Firestore (`clients` collection), resulting in **22 Active Participants**.
2. **Company Document Library & Vault (`CompanyLibraryModule.tsx`)**: A centralized company-wide document repository for uploading, organizing, previewing, and AI-analyzing **Financials/P&L/BAS**, **NDIS Policies & SOPs**, **HR Contracts & Insurance**, and **Clinical Templates & Service Agreements**, backed by Firestore and Google Drive sync.
3. **Practitioner Creation & Participant Caseload Assignment**: Full CRUD for creating and editing practitioners (credentials, AHPRA, NDIS Worker Screening, SCHADS level, billable targets, caseload capacity) plus a **Caseload Assignment Matrix** to assign **Primary** and **Secondary** practitioners across all 22 active participants (individually or in bulk).
4. **Company-Wide Operational Upgrades & Strategic Advisory**:
   - **Plan Manager Invoice Batching**: Group and export invoices grouped by your 8 active Plan Manager emails (`Leap in!`, `All Disability Plan Management`, `MyIntegra`, `Plan Partners`, `Orange Plan Management`, `Instacare`, `Better Plan Management`, `nib Thrive`).
   - **Service Agreement & Plan Budget Tracker**: Streamlined inline editor to update `$0.00` unrecorded participant budgets and Service Agreement status as plan documents arrive.
   - **Executive Practice Improvement Roadmap**: Actionable operational recommendations embedded into the Command Center and Company Library.

---

## 2. Activate All 22 NDIS Participants

All 18 participants listed below will be updated from `Onboarding` to `Active` in `/lib/seedData.ts`, synchronized into the live Zustand store, and upserted to Firestore (`clients` collection):

| # | Participant Name | NDIS Number | Plan Management | Plan Manager Invoice Email | New Status |
|---|---|---|---|---|---|
| 1 | **Celeste Rattray-Wood** | `431887495` | Plan Managed | `claims@planpartners.com.au` | `Active` |
| 2 | **Ayaan Ayaan** | `540878577` | Plan Managed | `mail@orangeplan.com.au` | `Active` |
| 3 | **Ben Rusic** | `430954586` | Plan Managed | `hello@instacare.com.au` | `Active` |
| 4 | **Harley Roy** | `430916807` | Plan Managed | `invoices@leapin.com.au` | `Active` |
| 5 | **Indiana McKenzie** | `541508064` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 6 | **Isaiah Farrugia-Borg** | `431144028` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 7 | **James Enright** | `430847521` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 8 | **Jenelle Rusic** | `431215499` | Plan Managed | `hello@instacare.com.au` | `Active` |
| 9 | **Reyansh Chawla** | `541655297` | Plan Managed | `accounts@betterplan.com.au` | `Active` |
| 10 | **Ryan Syed** | `431157600` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 11 | **Ryder Warburton** | `431400338` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 12 | **Selena Ajak** | `431148303` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 13 | **Viren Virdi** | `541573056` | Plan Managed | `claims@nibthrive.com.au` | `Active` |
| 14 | **Derin Ozsoy** | `430553200` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 15 | **Jeremy Tan** | `430833800` | Self Managed | — | `Active` |
| 16 | **Saffron Robinson** | `430624739` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 17 | **Zachariah Psaila Nogueira** | `431407489` | Plan Managed | `info@alldisability.com.au` | `Active` |
| 18 | **Levi McGarigle** | `541751329` | Plan Managed | `info@alldisability.com.au` | `Active` |

*(Combined with **Abu Bakr Tyson Amiri**, **Eman Syed**, **Titan Tai**, and **Tyson Gilson**, all **22 participants** will now be **Active**.)*

---

## 3. Company Document Library & Operations Vault (`CompanyLibraryModule.tsx`)

We will create a dedicated **Company Document Library** module accessible from the main navigation sidebar (`Company Library`) and persisted to Firestore (`companyDocuments` collection):

1. **Five Structured Company Folders**:
   - **Financials, P&L, BAS & Tax Records**: Upload Profit & Loss statements, quarterly BAS statements, Xero exports, payroll summaries, and bank statements.
   - **NDIS Policies, SOPs & Audit Governance**: Store Incident Management SOPs, Restrictive Practice Governance policies, Risk Management Frameworks, and NDIS Quality & Safeguards Commission audit packs.
   - **HR Contracts, Insurance & Business Licenses**: Store Professional Indemnity & Public Liability certificates ($20M cover), WorkCover certificates, employment contracts, and provider registration documents.
   - **Clinical Templates & Service Agreements**: Store Master Service Agreements, Schedule of Supports, Consent to Share Information forms, and BSP/WHODAS templates.
   - **Participant NDIS Plans & Schedules**: Direct repository for participant NDIS Plan PDFs that can link directly to any of the 22 active participants and update their recorded budget.
2. **Upload, Tagging, Expiry & AI Extraction**:
   - Multi-file drag-and-drop upload supporting PDF, CSV, XLSX, DOCX, and images.
   - Metadata tracking: Category, Version (`v1.0`, `v2.0`), Review / Expiry Date, Compliance Status (`Current`, `Review Due Soon`, `Expired`), Owner, and Tags.
   - **AI Document Classification & Key Fact Extraction**: Uses `/api/gemini` to extract evidenced figures (e.g., policy review dates, insurance coverage amounts, financial period totals, or NDIS plan budgets) strictly from uploaded text/files without fabricating numbers.
   - **Google Drive Sync**: Link or import files directly from your connected Google Workspace / Drive folders.

---

## 4. Practitioner Management & Caseload Assignment Matrix

We will upgrade the **HR & Workforce Module (`HRModule.tsx`)** and **Participants Module (`ClientsModule.tsx`)** with end-to-end practitioner creation and participant allocation:

1. **Create & Edit Practitioners Modal**:
   - Create real company practitioners and support workers with:
     - Full Name, Role / Discipline (e.g., *Senior Behaviour Support Practitioner*, *Occupational Therapist*, *Speech Pathologist*, *Therapy Assistant / Support Worker*)
     - Email & Phone
     - AHPRA / PBS Practitioner Registration Number
     - NDIS Worker Screening Check (NDISWC) Number & Expiry Date
     - Working with Children Check (WWCC) & First Aid Expiry
     - SCHADS Classification Level & Hourly Billable Rate / Target Hours
     - Maximum Caseload Capacity (e.g., 8–12 participants)
   - Persists immediately to Firestore (`practitioners` collection) and Zustand state.
2. **Caseload Assignment Matrix (Single & Bulk Assignment)**:
   - Interactive matrix view showing all **22 Active Participants** alongside your practitioners.
   - Assign both a **Primary Practitioner** and a **Secondary / Support Practitioner** per participant.
   - **Bulk Assign Bar**: Select multiple participants (e.g., filter by disability, suburb, or unassigned status) and assign them to a chosen Primary or Secondary Practitioner in one click.
   - **Live Caseload Capacity & Utilization Meters**: Automatically calculates each practitioner's active caseload count, weekly allocated hours, and utilization percentage.

---

## 5. Company-Wide Operational Upgrades & Advisory

1. **Plan Manager Invoice Batching (`BillingModule.tsx` & `ClientsModule.tsx`)**:
   - Automatically groups your 22 active participants by their Plan Manager invoice email (`info@alldisability.com.au` [11 participants], `invoices@leapin.com.au` [2], `hello@instacare.com.au` [2], `claims@myintegra.com.au` [1], `claims@planpartners.com.au` [1], `mail@orangeplan.com.au` [1], `accounts@betterplan.com.au` [1], `claims@nibthrive.com.au` [1], plus `Self Managed` [2]) so you can generate batch invoices and remittance summaries per Plan Manager.
2. **Quick Plan Budget & Service Agreement Editor**:
   - Inline modal in `ClientsModule.tsx` allowing staff to enter Core and Capacity Building budgets, Plan Start/End dates, and Service Agreement status for the 21 participants currently showing `$0.00` budget.
3. **Executive Practice Advisory & Improvement Guide**:
   - Embedded strategic roadmap advising on clinical governance, cashflow optimization, NDIS audit readiness, and workflow automation tailored to your 22-participant roster.
