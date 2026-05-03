# HIMS by Healthezee – Product Requirements Document (PRD)

## 1. Product Vision
Cloud-native multi-tenant Hospital Information Management System (HIMS) supporting clinics (OPD) and hospitals (OPD + IPD), with AI-ready architecture.

---

## 2. Product Scope & Tiers
The Healthezee HIMS follows a 4-tier subscription model, enabling hospitals to scale as they grow.

### Tier 1: Basic (OPD & Communications)
- Patient Management (MRN Generation)
- Appointment Scheduling
- OPD Consultation (Core EMR)
- Prescription Generation
- Invoicing & Billing
- **Message Board (Internal Announcements)**
- **Mail Management (Signal Tracking)**
- **Support Ticketing System**

### Tier 2: Standard (Clinical Services)
- All Basic Features
- Laboratory Information System (LIS)
- Pharmacy Information Management (PIMS)
- Stock & Inventory Management

### Tier 3: Professional (IPD & In-patient)
- All Standard Features
- IPD Admission / Discharge Workflow
- Bed Management & Real-time Bed Map
- Nursing Workflows & Vitals
- Insurance Management

### Tier 4: Enterprise (AI & Multi-Tenant)
- All Professional Features
- **AI-Powered Discharge Summaries**
- **AI Clinical Insights & History Summaries**
- Nexus Multi-Tenant Management
- Global Communication Hub & Signal History

---

## 3. Architecture

### Multi-Tenant Model
- **Nexus (Control Plane)**: Centralized orchestration for provisioning, ticketing triage, and global signal monitoring.
- **Tenant DB (Isolated Shards)**: Secure, isolated data storage for each hospital instance.

---

## 4. User Roles

### Nexus Admin (Super Admin)
- Shard Provisioning & Lifecycle
- Support Ticket Resolution
- Global Communication Monitoring

### Tenant Staff
- Doctor (Clinical)
- Nurse (In-patient care)
- Receptionist (OPD Front desk)
- Pharmacist (Dispensing)
- Lab Technician (Diagnostics)
- Billing Staff (Finance)

---

## Core Modules (Enhanced)

### Support Ticketing
- Integrated system for tenants to raise technical bugs, feature requests, or plan upgrades.
- Real-time notification and resolution tracking in Nexus.

### Communication Hub (Global Signals)
- Nexus-level oversight of all system communications.
- Tracking password resets, onboarding status, and critical notifications across the platform.

## 5. Authentication
- Email + Password + Tenant Code
- JWT-based authentication

---

## 6. Core Modules

### Patient Management
- Create / update patient
- Standardized Medical Record Number (MRN) Generation
  - **Format:** `MRN-{YY}{MM}-{6-Digit-Sequence}` (e.g., `MRN-2605-000001`)
  - **Logic:** Year and Month prefix for temporal context, followed by a zero-padded sequential integer based on total patient count.
  - **Compliance:** Aligns with international healthcare standards, ensuring collision-proof uniqueness and chronologically sortable records.

### Appointment
- Schedule
- Status tracking

### Visits (Core EMR)
- Visit lifecycle

### Clinical EMR
- Complaints
- Vitals
- Diagnosis

### Prescription
- Multi-drug
- Dosage, frequency

### Billing
- Visit-based billing

---

## 7. UI Requirements

### EMR Screen
- Patient info
- Consultation
- Prescription
- Actions

---

## 8. APIs

- POST /login
- GET /patients
- POST /appointments
- POST /visits
- POST /billing

---

## 9. Data Model

- tenants
- users
- patients
- visits
- prescriptions
- bills

---

## 10. Security

- JWT
- RBAC
- Audit logs

---

## 11. Non-Functional

- Performance < 2 sec
- 99.9% uptime
- Scalable

---

## 12. AI Readiness

- Voice EMR
- Clinical insights
- RAG

---

## 13. MVP

- Multi-tenant
- OPD flow
- Billing

---

## 14. Risks

- Complexity → modular design
- UX → optimize consultation

---

## 15. Differentiators

- Multi-tenant architecture
- AI-ready
- Fast UX

---

## 16. Success Metrics

- Consultation < 2 min
- <3 clicks prescription
- Onboarding <5 min
