# HIMS by Healthezee – Product Requirements Document (PRD)

## 1. Product Vision
Cloud-native multi-tenant Hospital Information Management System (HIMS) supporting clinics (OPD) and hospitals (OPD + IPD), with AI-ready architecture.

---

## 2. Product Scope

### Tier 1: OPD
- Patient management
- Appointments
- Consultation (EMR)
- Prescription
- Billing

### Tier 2: OPD + IPD
- Admission / discharge
- Bed management
- Nursing workflows
- Insurance (future)

---

## 3. Architecture

### Multi-Tenant Model
- Nexus (Control Plane)
- Tenant DB (per hospital)

---

## 4. User Roles

### Nexus
- Super Admin
- Support

### Tenant
- Doctor
- Nurse
- Receptionist
- Billing staff

---

## 5. Authentication
- Email + Password + Tenant Code
- JWT-based authentication

---

## 6. Core Modules

### Patient Management
- Create / update patient
- MRN

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
