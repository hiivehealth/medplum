# Occupational Health EHR/MIS Demo - Medplum Implementation Plan

**Based on**: DHS Office of Health Security - Statement of Objectives (April 14, 2026)  
**Purpose**: Build a configurable demo in Medplum showcasing core occupational health workflows for ~200,000 DHS civilian employees

---

## 1. Executive Summary

This document outlines a phased approach to building a Medplum-based demo of the Occupational Health Electronic Health Record and Medical Information System (Occ Health EHR/MIS). The demo will focus on:

- **Unified occupational health records** for employees across their employment lifecycle
- **Medical surveillance** with longitudinal trend analysis and exposure-informed decision support
- **Case management** for injury/illness, return-to-work, and exposure follow-up
- **Role-based access control** with privacy-centric data governance
- **Standards-based interoperability** using FHIR R4 for integration with HR, labs, and analytics systems

---

## 2. Architecture Overview

### 2.1 Three-Layer Architecture

The solution comprises three integrated layers:

#### **Layer 1: Clinical/Occupational Health EHR**
- Encounter documentation (pre-placement, periodic, fitness-for-duty, exit exams)
- Lab results, imaging, and vital signs
- Clinical notes and scanned outside records
- Immunization records
- Drug and alcohol testing workflows

#### **Layer 2: Occupational/Exposure Data**
- Job history and duty locations
- Known/potential exposures (chemical, biological, physical, ergonomic)
- Similar Exposure Groups (SEGs)
- Surveillance program enrollment and participation
- Incidents and near-misses
- Controls and interventions

#### **Layer 3: Case Management & CRM**
- Outreach and notifications
- Reminders for due surveillance
- Follow-up tracking for exposed/high-risk cohorts
- Return-to-work workflow and restrictions
- Clinical override documentation
- Clearance/fitness determinations

---

## 3. FHIR Data Model

### 3.1 Core FHIR Resources

**Patient & Demographics**
- `Patient` - DHS employee with occupational health extensions
- `RelatedPerson` - Emergency contacts, beneficiaries
- `Organization` - DHS components, clinics, external providers

**Clinical Records**
- `Encounter` - Clinical encounters (exam types, encounter type classifications)
- `Observation` - Vital signs, exam findings, lab results, hearing/respiratory tests
- `Condition` - Diagnoses, work-related conditions, occupational illnesses
- `Procedure` - Medical procedures, fit testing, baseline exams
- `Immunization` - Occupational vaccination records
- `DiagnosticReport` - Lab results, imaging reports
- `MedicationStatement` - Medications relevant to occupational health
- `ServiceRequest` - Orders for surveillance exams, follow-ups

**Occupational/Exposure Data**
- `Basic` - Job role, location, Similar Exposure Group mapping
- `CarePlan` - Surveillance programs and protocols
- `CoverageEligibilityRequest` - Clearance/fitness status tracking
- Custom extensions for:
  - Exposure history and incident tracking
  - Work restrictions and RTW status
  - Clinical overrides with audit trail

**Case Management**
- `Task` - Follow-up actions, notifications, reminders
- `Communication` - Outreach messages to employees/supervisors
- `List` - Cohort/surveillance panel enrollments
- `Bundle` - Transaction bundles for data migration

**Access & Privacy**
- `AuditEvent` - All access to employee records, disclosures to HR/supervisors
- `Consent` - Data sharing preferences and restrictions

### 3.2 Custom Extensions & Profiles

Create Medplum-specific FHIR profiles for:
- **Occupational Exam Encounter** - Distinguishes occupational from clinical encounters
- **Exposure Summary** - Longitudinal exposure history per employee
- **Surveillance Program** - Configurable panels (respiratory, hearing, etc.)
- **Work Restriction** - Time-bounded work status and specific limitations
- **Clinical Override** - Abnormal result acceptance with justification and audit trail

---

## 4. Core Workflows & Use Cases

### 4.1 Pre-Placement Examination
- **Actor**: Occupational health clinician, HR system
- **Inputs**: Employee demographics, job role, component
- **Process**:
  1. Auto-enroll in relevant surveillance programs based on job/exposure
  2. Create baseline exam encounter
  3. Capture medical history, physical exam, labs (baseline)
  4. Generate clearance determination
  5. Store as longitudinal baseline for future comparisons
- **Outputs**: Employee record created, clearance status, surveillance panel enrollments

### 4.2 Periodic/Annual Occupational Health Exam
- **Actor**: Occupational health clinician, occupational health manager
- **Process**:
  1. Recall list generated for due exams (configurable intervals)
  2. Clinician reviews exposure history and longitudinal trends
  3. Document findings, compare to baseline and previous years
  4. Apply clinical overrides if needed (with documentation)
  5. Determine clearance/fitness status
  6. Notify employee and HR of restrictions or follow-up needs
- **Decision Support**: Longitudinal view showing trends (e.g., audiometry decline, spirometry changes)

### 4.3 Workplace Injury/Illness Documentation
- **Actor**: Occupational health clinician, safety officer, supervisor
- **Process**:
  1. Document incident (date, location, description, exposure)
  2. Link to job/exposure/SEG
  3. Capture clinical findings and treatment
  4. Determine workers' comp eligibility
  5. Initiate return-to-work process
- **Outputs**: OSHA 301 form data, FECA claim support, RTW workflow initiation

### 4.4 Return-to-Work (RTW) Management
- **Actor**: Occupational health clinician, supervisor, HR
- **Process**:
  1. Create work restrictions (specific limitations, time-bounded)
  2. Notify supervisor and HR with "minimum necessary" info
  3. Schedule re-evaluation dates
  4. Document accommodation attempts and outcomes
  5. Clear restrictions when appropriate
- **Tracking**: Audit log of all notifications and restriction changes

### 4.5 Medical Surveillance Program Enrollment
- **Actor**: Occupational health admin, clinician
- **Process**:
  1. Define surveillance panels (e.g., respiratory protection, hearing conservation)
  2. Map to job roles, tasks, exposures, SEGs, locations
  3. Auto-enroll employees when job/exposure matches
  4. Generate recall lists for due exams
  5. Document participation and findings
  6. Identify outliers and at-risk cohorts
- **Tools**: Configurable panel builder, recall engine, trend analysis dashboard

### 4.6 Exposure Incident Follow-Up
- **Actor**: Occupational health clinician, case manager, supervisor
- **Process**:
  1. Identify employees exposed to incident (e.g., bloodborne pathogen, chemical spill)
  2. Auto-enroll in post-exposure surveillance program
  3. Generate tasks for baseline exam, follow-up testing, prophylaxis
  4. Send notifications with testing schedule
  5. Document all procedures and findings
  6. Close case when cleared
- **Tracking**: CRM-style follow-up with reminders and escalation

### 4.7 Longitudinal Fitness/Clearance Review
- **Actor**: Occupational health manager, clinician
- **Process**:
  1. Pull employees with clearance expiration or requiring re-eval
  2. Review full medical history, exposures, lab trends
  3. Assess fitness for duty, apply clinical overrides if needed
  4. Document rationale for all decisions
  5. Generate reports for component leadership
- **Decision Support**: Dashboards showing compliance, at-risk cohorts, required actions

### 4.8 Drug and Alcohol Testing (DAT) Program
- **Actor**: Occupational health admin, testing provider, clinician
- **Process**:
  1. Identify employees subject to DAT (role-based)
  2. Schedule/order tests
  3. Ingest test results from provider
  4. Link results to employee record
  5. Generate compliance reports
  6. Flag out-of-policy results for follow-up
- **Integration**: Interface with external testing provider systems

---

## 5. Implementation Phases

### **Phase 1: Foundation & Data Model (Weeks 1-4)**

**Goals:**
- Set up Medplum instance and development environment
- Define FHIR profiles and extensions for occupational health
- Build sample data model
- Create basic patient and encounter records

**Deliverables:**
1. Medplum instance deployed (local or staging)
2. Custom FHIR profiles for:
   - Occupational exam encounters
   - Exposure history
   - Work restrictions
   - Surveillance program enrollments
3. Sample data loader (10-20 test employees with diverse roles/exposures)
4. Basic audit logging for access control

**Tasks:**
- [ ] Set up Medplum project and database
- [ ] Create occupational health-specific FHIR profiles/extensions
- [ ] Design Patient extensions for occupational fields (job history, exposures, clearance status)
- [ ] Create Encounter extensions (exam type, occupational flag, surveillance panel linkage)
- [ ] Build data model documentation
- [ ] Create sample data seeding script

---

### **Phase 2: Clinical Documentation & Encounters (Weeks 5-8)**

**Goals:**
- Build encounter workflows (pre-placement, periodic, fitness-for-duty)
- Create clinician UI for entering exam data
- Implement longitudinal view

**Deliverables:**
1. Pre-placement exam workflow
2. Periodic exam workflow with baseline comparison
3. Clinician UI—encounter creation and result entry
4. Longitudinal patient summary view showing:
   - Job history and exposures
   - All encounter dates and types
   - Key lab trends (e.g., hearing, spirometry)
   - Current clearance status
   - Current surveillance program enrollments

**Tasks:**
- [ ] Build React UI for encounter creation (encounter type selector, exam template rendering)
- [ ] Create form components for vital signs, physical exam findings, lab results
- [ ] Implement baseline capture and longitudinal comparison logic
- [ ] Build longitudinal summary dashboard
- [ ] Create encounter detail view with side-by-side baseline comparison
- [ ] Add observation/result entry components

---

### **Phase 3: Exposure & Surveillance (Weeks 9-12)**

**Goals:**
- Model occupational exposures and Similar Exposure Groups
- Build surveillance program configuration and auto-enrollment
- Create recall engine for due exams

**Deliverables:**
1. Exposure data model and Patient extensions
2. Configurable surveillance panel builder UI
3. Auto-enrollment logic (job/exposure matching)
4. Recall list generator
5. Recall dashboard showing due/overdue employees

**Tasks:**
- [ ] Design exposure model (exposures, SEGs, incidents, controls)
- [ ] Create UI for surveillance admin to define panels
- [ ] Implement auto-enrollment logic based on job/exposure
- [ ] Build recall engine and scheduler
- [ ] Create recall list view with filtering and recall-date sorting
- [ ] Add ability to generate bulk recalls

---

### **Phase 4: Case Management & RTW (Weeks 13-16)**

**Goals:**
- Build return-to-work workflow and work restrictions
- Implement case management (tasks, notifications, follow-up tracking)
- Create supervisor/HR notification system

**Deliverables:**
1. Work restriction data model and creation UI
2. Task/follow-up management system
3. Notification template system
4. Case management dashboard
5. HR/supervisor minimal-necessary data views

**Tasks:**
- [ ] Create Work Restriction resource extensions (specific limitations, end date, re-eval date)
- [ ] Build RTW workflow UI (create restriction, schedule re-eval, clear)
- [ ] Implement Task creation for follow-ups and reminders
- [ ] Create notification service with templates (email/in-app)
- [ ] Build case management board (Kanban-style) for open follow-ups
- [ ] Create minimal-necessary view for supervisors and HR (work status, restrictions only)
- [ ] Implement audit logging for all notifications sent

---

### **Phase 5: Medical Surveillance & Decision Support (Weeks 17-20)**

**Goals:**
- Build longitudinal trend analysis
- Implement clinical override workflow
- Create readiness dashboards and reports

**Deliverables:**
1. Trend analysis component (lab trends, exam findings over time)
2. Clinical override documentation UI
3. Component/unit-level compliance dashboards
4. Medical readiness reports
5. Cohort identification tools

**Tasks:**
- [ ] Implement trend analysis for key observations (hearing, spirometry, vitals)
- [ ] Build Clinical Override capture form with justification and audit trail
- [ ] Create dashboard showing:
     - Surveillance compliance by unit/component
     - Employees with outstanding requirements
     - At-risk cohorts (e.g., abnormal trends)
     - Clearance status distribution
- [ ] Build report generator for:
     - Individual medical readiness
     - Component-level readiness
     - Program compliance
- [ ] Implement drill-down from aggregated dashboards to individual records

---

### **Phase 6: Injury/Illness & OSHA Integration (Weeks 21-24)**

**Goals:**
- Document workplace injuries/illnesses with OSHA compliance
- Link to exposures and surveillance programs
- Generate OSHA forms

**Deliverables:**
1. Workplace incident/injury encounter type
2. OSHA 300/301 form generation
3. Workers' compensation (FECA) support
4. Incident-to-surveillance linking

**Tasks:**
- [ ] Create Injury/Illness Encounter with structured incident capture
- [ ] Implement mapping to OSHA 300/300A log data
- [ ] Build OSHA 301 form generator
- [ ] Create FECA claim support forms
- [ ] Implement automatic post-incident surveillance enrollment
- [ ] Build incident/exposure link tracking

---

### **Phase 7: Security, Access Control & Privacy (Weeks 25-28)**

**Goals:**
- Implement role-based access control (RBAC)
- Segregate occupational from clinical data
- Build audit logging and reporting
- Enforce privacy workflows

**Deliverables:**
1. RBAC implementation (occupational health roles, HR roles, supervisor roles, admin)
2. Encounter-type-specific access rules
3. Minimal-necessary data views for non-clinical roles
4. Audit log and access reporting
5. Consent and data-sharing configuration

**Tasks:**
- [ ] Define Medplum roles: Occ Health Clinician, Occ Health Manager, Component Admin, HR User, Supervisor, Employee
- [ ] Implement encounter-level access rules (full access for occupational role, restricted for others)
- [ ] Build encounter tagging/classification to enforce separation
- [ ] Create Consent resources for data sharing preferences
- [ ] Implement minimal-necessary views:
     - Supervisors see: work status, restrictions, start/end dates
     - HR sees: clearance status, restrictions, required actions
     - Employees see: their own records
- [ ] Build AuditEvent logging for all data access and disclosures
- [ ] Create audit dashboard and report generation

---

### **Phase 8: Interoperability & Integration (Weeks 29-32)**

**Goals:**
- Build FHIR APIs for data exchange
- Create integration patterns for HR systems, labs, analytics
- Support data import from legacy systems

**Deliverables:**
1. FHIR REST APIs for encounter, observation, surveillance data
2. Sample integrations (HR feed, lab result ingestion)
3. Data migration/import tools
4. HL7 v2 adapter (for lab systems)

**Tasks:**
- [ ] Expose FHIR APIs for Patient, Encounter, Observation, Task, CarePlan (READ, CREATE, UPDATE)
- [ ] Build sample HR integration adapter (consume employee roster, update job/exposure)
- [ ] Create lab result ingestion workflow (HL7 v2 inbound processing)
- [ ] Build data migration tools (CSV import, legacy data mapping)
- [ ] Create API documentation and integration samples
- [ ] Implement authorization checks on all APIs

---

### **Phase 9: Dashboards, Analytics & Reporting (Weeks 33-36)**

**Goals:**
- Build executive/management dashboards
- Create configurable reporting tools
- Implement population-level analytics

**Deliverables:**
1. Medical readiness dashboard (enterprise-wide compliance, at-risk cohorts)
2. Component-level readiness reports
3. Surveillance program performance dashboards
4. Custom report builder UI
5. De-identified cohort analytics

**Tasks:**
- [ ] Create enterprise readiness dashboard:
     - Surveillance compliance by program/component
     - Clearance status distribution
     - Outstanding requirements by category
     - At-risk employee identification
- [ ] Build drill-down capability (click on component → employees → individual record)
- [ ] Create configurable report templates (medical readiness, program compliance, incident summaries)
- [ ] Build report scheduler and export (PDF, CSV)
- [ ] Implement de-identified data export for analytics platforms
- [ ] Create sample dashboards for different user roles

---

### **Phase 10: Testing, Documentation & Hardening (Weeks 37-40)**

**Goals:**
- Comprehensive testing and bug fixes
- Create user and technical documentation
- Performance and security hardening
- Prepare for production-readiness assessment

**Deliverables:**
1. Unit tests, integration tests, E2E tests
2. User documentation (clinician, admin, supervisor guides)
3. Technical documentation (API docs, deployment guide)
4. Security assessment and remediation
5. Performance tuning

**Tasks:**
- [ ] Write unit tests for core business logic (auto-enrollment, recall generation, trend analysis)
- [ ] Create integration tests for workflows (encounter → surveillance → recall)
- [ ] Build E2E tests for key paths (pre-placement exam → recall → follow-up)
- [ ] Create user guides for each role
- [ ] Write API documentation and integration samples
- [ ] Conduct security review and fix issues
- [ ] Run performance tests under load
- [ ] Create deployment guide and runbook

---

## 6. Key Features by Phase Summary

| Phase | Key Features |
|-------|--------------|
| 1 | FHIR profiles, data model, sample data |
| 2 | Encounter workflows, clinician UI, longitudinal views |
| 3 | Exposures, surveillance programs, recall engine |
| 4 | Case management, RTW, notifications |
| 5 | Trends, clinical overrides, readiness dashboards |
| 6 | Injury/illness, OSHA forms |
| 7 | RBAC, access control, audit logging |
| 8 | FHIR APIs, integrations, data migration |
| 9 | Executive dashboards, reporting, analytics |
| 10 | Testing, documentation, hardening |

---

## 7. Technology Stack

**Frontend:**
- React + TypeScript
- Medplum React components
- Recharts for trend visualization
- React Query for data fetching

**Backend:**
- Medplum server (open-source)
- PostgreSQL database
- Node.js for custom logic
- Bull queues for background tasks (recall generation, notifications)

**Integration:**
- FHIR R4 REST APIs
- HL7 v2 message processing
- OAuth 2.0 for access control
- JWT for API authentication

**Deployment:**
- Docker containerization
- Docker Compose for local development
- Kubernetes-ready manifests for production
- CI/CD pipeline (GitHub Actions)

---

## 8. Configuration & Customization Points

The demo should showcase Medplum's ability to support configuration without code changes:

1. **Surveillance Panel Configuration** - Admin UI to define panels and eligibility rules
2. **Encounter Templates** - Configure exam types and required fields
3. **Workflow States** - Define RTW status options and transitions
4. **Roles and Permissions** - Configure RBAC without code changes
5. **Report Templates** - Create custom reports via UI
6. **Dashboard Customization** - Configure metrics and drill-down options
7. **Notification Templates** - Customize message text and recipients
8. **Data Mapping** - Define HR system field mappings

---

## 9. Sample Data Scenarios

Create realistic personas and scenarios:

1. **Alice (Law Enforcement)** - Recurring annual exams, hearing conservation surveillance, past incident exposure
2. **Bob (IT Staff)** - Pre-placement baseline, periodic exams, no special exposures
3. **Carol (HAZMAT Handler)** - Respiratory protection program, chemical exposure panels, documented incident history
4. **David (FLETC Instructor)** - Multiple component exams, fit-for-duty requirements, RTW case study

Each scenario demonstrates key workflows and decision points.

---

## 10. Success Criteria

- ✅ Core workflows operational end-to-end
- ✅ 50+ sample employees with realistic data
- ✅ Clinician can complete pre-placement, periodic, and RTW exams
- ✅ Surveillance recall engine functions correctly
- ✅ Longitudinal trend analysis works for key indicators
- ✅ Role-based access control enforced
- ✅ Audit logs capture all access
- ✅ FHIR APIs functional and documented
- ✅ Medical readiness dashboard shows correct compliance metrics
- ✅ System handles 10x growth without redesign (scalability demonstrated)

---

## 11. Next Steps

1. **Set up Medplum development environment** (Phase 1)
2. **Align with DHS on priority workflows** (pre-placement, surveillance, RTW)
3. **Create detailed technical design** for FHIR profiles and extensions
4. **Build iteratively** with user feedback from occupational health domain experts
5. **Plan production migration** from legacy systems (data mapping, validation)

---

## 12. References

- DHS OHS Statement of Objectives (April 14, 2026)
- FHIR R4 Specification (HL7)
- OSHA 1910.1020 Occupational Record Keeping
- Medplum Documentation: https://www.medplum.com/docs
