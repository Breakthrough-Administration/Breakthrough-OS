# Implementation Plan: CommandCenter Quick Action Menu & Participant Clinical Timeline

## 1. Overview & Objectives
We will enhance **Breakthrough OS** with two high-velocity clinical workflow upgrades while maintaining strict build and runtime stability across the Next.js workspace:

1. **CommandCenter Quick Action Floating Menu (`CommandCenter.tsx`)**: A floating speed-dial launcher positioned in the lower-right viewport of the Command Center that lets practitioners rapidly trigger **New Case Note**, **Log Incident**, **Add NDIS Goal**, or **Ingest Drive Folder** via inline quick-entry modals, with a one-click option to jump directly into the full target module.
2. **ClientsModule Vertical Clinical Timeline (`ClientsModule.tsx` & `ParticipantClinicalTimeline.tsx`)**: A chronological vertical timeline integrated into the Participant Detail view of `ClientsModule` that aggregates and visualizes **Clinical Case Notes**, **Reportable Incidents**, **NDIS Goal Progression & GAS Milestones**, and **Clinical Document Uploads**, complete with category filter tabs, live keyword search, and expandable event cards.
3. **Runtime & Build Stability**: Maintain isolated `.next-dev` (development server) and `.next` (production build) outputs, ensure zero TypeScript or runtime errors, and preserve full Light/Dark theme parity.

---

## 2. Key Features & UX Flows

### A. CommandCenter Quick Action Floating Menu
- **Floating Speed-Dial Trigger**:
  - Fixed bottom-right launcher button (`Quick Actions`) with smooth spring/opacity transitions and keyboard shortcut toggle (`Alt+N` / `Esc` to close).
  - Expands upward into a structured speed-dial menu featuring:
    1. **New Case Note** — Opens an inline SOAP/BIRP/SIMPL quick-entry modal bound to `addCaseNote`, with participant selector, session duration, clinical summary fields, and an **"Open Full Case Notes Module"** jump button.
    2. **Log Reportable Incident** — Opens an inline NDIS Commission incident logger bound to `addIncident`, capturing participant, severity (`Low`, `Medium`, `High`, `Critical - 24h Notice`), category, immediate action taken, and an **"Open Incidents Module"** jump button.
    3. **Add NDIS Goal** — Opens an inline goal creation modal bound to `addClientGoal`, capturing target participant, goal title, NDIS support category (`Capacity Building`, `Core`, `Social & Community`), target date, baseline GAS score (`-2` to `+2`), and an **"Open NDIS Goal Tracker"** jump button.
    4. **Ingest Drive Folder (AI)** — Launches the Google Drive Folder AI Ingestion modal directly from the speed-dial.
- **Live Feedback & Audit Logging**:
  - Submitting any inline quick-entry modal persists immediately to the Zustand store (`useManagementStore`), writes an immutable entry via `addAuditLog`, and displays a confirmation toast with a direct link to view the record in its dedicated module.

### B. ClientsModule Vertical Clinical Timeline
- **Unified Chronological Event Engine**:
  - Dynamically aggregates all records for the currently selected participant (`selectedClient`) across four clinical streams:
    - **Clinical Notes**: SOAP, BIRP, and SIMPL session notes (`caseNotes` filtered by `clientId`), including practitioner, session duration, and billable support item code.
    - **Incidents**: Behavioural and statutory incidents (`incidents` filtered by `clientId`), highlighting severity, NDIS Commission 24h status, and antecedent/response details.
    - **Goal Milestones**: NDIS goal creation targets, achievement status, and historical Goal Attainment Scaling (`gasHistory`) progression checkpoints from `selectedClient.goals`.
    - **Documents**: Linked Google Drive clinical vault files and uploaded assessments (`attachedDocuments` / `documents`), including folder category and uploader metadata.
- **Interactive Controls & Expandable Details**:
  - **Segmented Category Filter Bar**: Filter events by `All Events`, `Clinical Notes`, `Goal Milestones`, `Incidents`, or `Documents` with live event counts.
  - **Live Timeline Search**: Instant keyword filtering across event titles, clinical notes, practitioner names, and support categories.
  - **Sort Direction Toggle**: Switch between `Newest First` and `Oldest First`.
  - **Expandable Event Nodes**: Clicking any timeline node expands its full clinical payload (e.g., full SOAP breakdown, GAS score progression history, incident immediate actions, or document preview/Drive actions) alongside a **"View in Module"** action button.
  - **Empty State Handling**: When a participant has no events matching the active filter, renders a clean empty state with quick triggers to log a note, add a goal, or link a Google Drive document.

---

## 3. Design & Aesthetic Direction
- **Clinical Precision & Dual-Theme Parity**: Full Light and Dark mode surface/text pairing (`bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`) consistent with Breakthrough OS.
- **Tabular Numerals & Zero-Pill Metadata**: All timestamps, durations, GAS scores, and event counters use `font-mono tabular-nums`; static event metadata uses clean typographic separators (`·`) while interactive filter tabs use segmented button states.
- **Accessible Semantic Signaling**: Each timeline category uses a distinct icon and label (`FileText` for Clinical Notes, `Target` for Goal Milestones, `AlertOctagon` for Incidents, `FolderOpen` for Documents) so state is never communicated by color alone.

---

## 4. Verification Plan
- **Type & Build Verification**: Run `compile_applet` (`npm run build`) to confirm zero TypeScript, Next.js route, or bundle errors.
- **Live Server Verification**: Verify the running development server on port 3000 responds with `HTTP/1.1 200 OK` and that both new workflows operate seamlessly with live and sample NDIS datasets.
