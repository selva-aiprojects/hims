
-- HIMS COMPLETE TENANT SCHEMA (FINAL PRODUCTION SYNC)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================= TENANT & RBAC =================
DROP TABLE IF EXISTS tenant_settings CASCADE;
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name VARCHAR(255),
  tenant_code VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'staff', -- Legacy role fallback
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dynamic RBAC Tables
DROP TABLE IF EXISTS rbac_roles CASCADE;
CREATE TABLE rbac_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS rbac_menus CASCADE;
CREATE TABLE rbac_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(100) NOT NULL,
    path VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    required_plan VARCHAR(50) DEFAULT 'basic', -- basic, professional, enterprise
    parent_id UUID REFERENCES rbac_menus(id),
    sort_order INT DEFAULT 0
);

DROP TABLE IF EXISTS rbac_permissions CASCADE;
CREATE TABLE rbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PATIENT_PII_VIEW'
    description TEXT
);

DROP TABLE IF EXISTS rbac_role_menus CASCADE;
CREATE TABLE rbac_role_menus (
    role_id UUID REFERENCES rbac_roles(id),
    menu_id UUID REFERENCES rbac_menus(id),
    PRIMARY KEY (role_id, menu_id)
);

DROP TABLE IF EXISTS rbac_role_permissions CASCADE;
CREATE TABLE rbac_role_permissions (
    role_id UUID REFERENCES rbac_roles(id),
    permission_id UUID REFERENCES rbac_permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

DROP TABLE IF EXISTS rbac_user_roles CASCADE;
CREATE TABLE rbac_user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES rbac_roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- ================= MASTERS HUB TABLES =================

DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  description TEXT,
  hod VARCHAR(255),
  specialty VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Active',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS designations CASCADE;
CREATE TABLE designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

DROP TABLE IF EXISTS specialities CASCADE;
CREATE TABLE specialities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  base_consultation_fee NUMERIC DEFAULT 0,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS consultation_modes CASCADE;
CREATE TABLE consultation_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  surcharge_percent NUMERIC DEFAULT 0,
  is_virtual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS diseases CASCADE;
CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  category VARCHAR(100),
  icd_code VARCHAR(50),
  severity_level VARCHAR(50) DEFAULT 'Moderate',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS diagnostic_types CASCADE;
CREATE TABLE diagnostic_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

DROP TABLE IF EXISTS diagnostics CASCADE;
CREATE TABLE diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type_id UUID REFERENCES diagnostic_types(id),
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

DROP TABLE IF EXISTS treatments CASCADE;
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  category VARCHAR(100),
  price NUMERIC DEFAULT 0,
  description TEXT,
  cpt_code VARCHAR(50),
  estimated_duration INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS services CASCADE;
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type VARCHAR(50), -- consultation, lab, pharmacy, procedure
  category VARCHAR(100),
  service_code VARCHAR(50),
  price NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS drug_categories CASCADE;
CREATE TABLE drug_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

DROP TABLE IF EXISTS drug_generics CASCADE;
CREATE TABLE drug_generics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  drug_class VARCHAR(100),
  category_id UUID REFERENCES drug_categories(id)
);

DROP TABLE IF EXISTS dosage_guidelines CASCADE;
CREATE TABLE dosage_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_id UUID REFERENCES drug_generics(id),
  dosage VARCHAR(100),
  frequency VARCHAR(50)
);

DROP TABLE IF EXISTS medicines CASCADE;
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  category VARCHAR(100),
  composition TEXT,
  dosage_adult VARCHAR(255),
  dosage_pediatric VARCHAR(255),
  instructions TEXT,
  stock_quantity INTEGER DEFAULT 100,
  unit_price NUMERIC DEFAULT 0,
  expiry_date DATE DEFAULT (NOW() + INTERVAL '1 year'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS wards CASCADE;
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  capacity INTEGER DEFAULT 10,
  type VARCHAR(50) DEFAULT 'General',
  floor VARCHAR(20),
  base_charge NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= PATIENTS & CLINICAL =================

DROP TABLE IF EXISTS patients CASCADE;
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  gender VARCHAR(20),
  dob DATE,
  age INTEGER,
  phone VARCHAR(20),
  address TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS encounters CASCADE;
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  type VARCHAR(50) DEFAULT 'OPD', -- OPD, IPD, Emergency
  status VARCHAR(50) DEFAULT 'Draft',
  diagnosis TEXT,
  notes TEXT,
  vitals JSONB,
  complaints TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS complaints CASCADE;
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID,
  encounter_id UUID REFERENCES encounters(id),
  complaint TEXT
);

DROP TABLE IF EXISTS vitals CASCADE;
CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID,
  encounter_id UUID REFERENCES encounters(id),
  bp VARCHAR(20),
  pulse INTEGER,
  temperature NUMERIC
);

DROP TABLE IF EXISTS diagnoses CASCADE;
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID,
  encounter_id UUID REFERENCES encounters(id),
  diagnosis TEXT
);

DROP TABLE IF EXISTS follow_ups CASCADE;
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  scheduled_date DATE,
  status VARCHAR(50) DEFAULT 'Pending'
);

-- ================= APPOINTMENTS & VISITS =================
DROP TABLE IF EXISTS appointments CASCADE;
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  appointment_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS visits CASCADE;
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= PHARMACY =================
DROP TABLE IF EXISTS drug_brands CASCADE;
CREATE TABLE drug_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_id UUID REFERENCES drug_generics(id),
  brand_name VARCHAR(255)
);

DROP TABLE IF EXISTS pharmacy_batches CASCADE;
CREATE TABLE pharmacy_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES drug_brands(id),
  batch_number VARCHAR(100),
  expiry_date DATE,
  quantity INTEGER
);

DROP TABLE IF EXISTS pharmacy_dispenses CASCADE;
CREATE TABLE pharmacy_dispenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id)
);

DROP TABLE IF EXISTS pharmacy_dispense_items CASCADE;
CREATE TABLE pharmacy_dispense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispense_id UUID REFERENCES pharmacy_dispenses(id),
  medicine_id UUID REFERENCES medicines(id),
  quantity INTEGER
);

DROP TABLE IF EXISTS prescriptions CASCADE;
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id),
  visit_id UUID REFERENCES visits(id)
);

DROP TABLE IF EXISTS prescription_items CASCADE;
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  drug_name VARCHAR(255),
  dosage VARCHAR(100),
  frequency VARCHAR(50),
  duration VARCHAR(50)
);

-- ================= LAB =================
DROP TABLE IF EXISTS lab_orders CASCADE;
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id),
  diagnostic_id UUID REFERENCES diagnostics(id),
  status VARCHAR(50) DEFAULT 'Pending'
);

DROP TABLE IF EXISTS lab_results CASCADE;
CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID REFERENCES lab_orders(id),
  result JSONB
);

-- ================= BILLING & INSURANCE =================
DROP TABLE IF EXISTS invoices CASCADE;
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  bill_type VARCHAR(50),
  payment_mode VARCHAR(50),
  subtotal NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Unpaid',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS invoice_items CASCADE;
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  description VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0
);

DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC,
  payment_mode VARCHAR(50)
);

DROP TABLE IF EXISTS insurance_providers CASCADE;
CREATE TABLE insurance_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255)
);

DROP TABLE IF EXISTS insurance_claims CASCADE;
CREATE TABLE insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  claim_amount NUMERIC,
  status VARCHAR(50)
);

-- ================= COMMUNICATIONS & TICKETING =================
DROP TABLE IF EXISTS communications CASCADE;
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  author_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS communication_logs CASCADE;
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient VARCHAR(255),
  subject VARCHAR(255),
  type VARCHAR(50), -- EMAIL, SMS, SIGNAL
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= ACCOUNTING =================
DROP TABLE IF EXISTS accounts CASCADE;
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type VARCHAR(50)
);

DROP TABLE IF EXISTS journal_entries CASCADE;
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

DROP TABLE IF EXISTS journal_lines CASCADE;
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journal_entries(id),
  debit NUMERIC,
  credit NUMERIC
);

-- ================= SEED DATA (PRODUCTION MASTERS) =================

INSERT INTO departments (name, description, hod, specialty, status) VALUES
('General Medicine', 'Primary care and internal medicine', 'Dr. Smith', 'Internal Medicine', 'Active'),
('Cardiology', 'Heart and vascular care', 'Dr. Johnson', 'Cardiologist', 'Active'),
('Pediatrics', 'Child health and development', 'Dr. Lee', 'Pediatrician', 'Active'),
('Orthopedics', 'Bone and joint care', 'Dr. Brown', 'Orthopedic Surgeon', 'Active');

INSERT INTO specialities (name, base_consultation_fee, description) VALUES
('General Physician', 500, 'Primary consultation for all ailments'),
('Senior Cardiologist', 1500, 'Expert cardiac care and consultation'),
('Pediatric Surgeon', 1200, 'Surgical care for children'),
('Orthopedic Consultant', 1000, 'Bone and joint specialist');

INSERT INTO consultation_modes (name, surcharge_percent, is_virtual) VALUES
('In-Person', 0, FALSE),
('Video Call', 10, TRUE),
('Emergency Home Visit', 50, FALSE);

INSERT INTO diseases (name, category, icd_code, severity_level) VALUES
('Hypertension', 'Cardiovascular', 'I10', 'Moderate'),
('Diabetes Mellitus Type 2', 'Endocrine', 'E11', 'Moderate'),
('Acute Bronchitis', 'Respiratory', 'J20', 'Mild'),
('Osteoarthritis', 'Musculoskeletal', 'M19', 'Moderate');

INSERT INTO treatments (name, price, description, cpt_code, estimated_duration) VALUES
('Wound Dressing', 200, 'Cleaning and dressing of minor wounds', '99211', 15),
('ECG Interpretation', 500, 'Electrocardiogram recording and analysis', '93000', 10),
('Physiotherapy Session', 800, '30-minute physical therapy session', '97110', 30);

INSERT INTO services (name, price, category, service_code, tax_percent) VALUES
('Consultation Fee', 500, 'Consultation', 'SRV001', 0),
('Blood Sugar Test', 150, 'Laboratory', 'LAB001', 0),
('X-Ray Chest', 600, 'Radiology', 'RAD001', 5);

INSERT INTO medicines (name, category, composition, dosage_adult, dosage_pediatric, instructions) VALUES
('Paracetamol 500mg', 'Analgesic', 'Paracetamol', '1 tablet twice daily', 'Half tablet twice daily', 'Take after food'),
('Amoxicillin 250mg', 'Antibiotic', 'Amoxicillin', '1 capsule thrice daily', 'Not recommended', 'Finish the full course'),
('Metformin 500mg', 'Antidiabetic', 'Metformin Hydrochloride', '1 tablet daily', 'Not recommended', 'Take with meals');

INSERT INTO diagnostic_types (name) VALUES ('Lab'), ('Radiology'), ('Pathology');
INSERT INTO diagnostics (name, price, type_id) VALUES ('CBC', 300, (SELECT id FROM diagnostic_types LIMIT 1));
INSERT INTO designations (name) VALUES ('Consultant'), ('Senior Resident'), ('Staff Nurse');

-- RBAC BOOTSTRAP SEEDING
INSERT INTO rbac_roles (name, description) VALUES 
('ADMIN', 'Full access to all modules and system settings'),
('DOCTOR', 'Clinical access, consultations, and patient EMR'),
('NURSE', 'Clinical support, vitals, and IPD monitoring'),
('PHARMACIST', 'Pharmacy inventory and prescription dispensing'),
('LAB_TECH', 'Laboratory orders and result processing'),
('SUPPORT', 'Front desk, registration, and administrative support');

-- Menu Registry with Subscription Mapping (Revised 4-Tier Model)
INSERT INTO rbac_menus (label, path, icon, sort_order, required_plan) VALUES
('Dashboard', '/tenant/dashboard', 'Dashboard', 1, 'basic'),
('OPD Registration', '/tenant/opd/registration', 'OPD', 2, 'basic'),
('Doctor''s Queue', '/tenant/opd/queue', 'Doctor', 3, 'basic'),
('Invoicing & Billing', '/billing', 'Billing', 10, 'basic'),
('Branding & UI Settings', '/tenant/settings', 'Dashboard', 12, 'basic'),
('Staff & RBAC', '/tenant/staff', 'Doctor', 13, 'basic'),
('Laboratory', '/tenant/lab', 'Lab', 4, 'standard'),
('Pharmacy Dashboard', '/tenant/pharmacy/dashboard', 'Pharmacy', 5, 'standard'),
('Stock Inventory', '/tenant/pharmacy/inventory', 'Pill', 6, 'standard'),
('Prescription Queue', '/tenant/pharmacy/queue', 'Receipt', 7, 'standard'),
('Hospital Settings (Masters)', '/tenant/masters', 'Settings', 11, 'standard'),
('Admission Desk', '/tenant/ipd/admission-desk', 'Bed', 7, 'professional'),
('IPD Bed Map', '/tenant/ipd/beds', 'Bed', 8, 'professional'),
('IPD Census & Daycare', '/tenant/ipd/admissions', 'Clipboard', 9, 'professional'),
('Insurance Management', '/tenant/billing/insurance', 'Receipt', 14, 'professional'),
('Discharge Summaries', '/tenant/ipd/discharge', 'Receipt', 15, 'professional'),
('Message Board', '/tenant/communication', 'Dashboard', 17, 'basic'),
('Ticketing Management System', '/tenant/support', 'Receipt', 16, 'basic');

-- Role-Menu Mappings (ADMIN - ALL)
INSERT INTO rbac_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM rbac_roles r, rbac_menus m WHERE r.name = 'ADMIN';

-- Role-Menu Mappings (DOCTOR)
INSERT INTO rbac_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM rbac_roles r, rbac_menus m 
WHERE r.name = 'DOCTOR' AND m.label IN ('Dashboard', 'Doctor''s Queue', 'Laboratory', 'IPD Census', 'Bed Map');

-- Role-Menu Mappings (PHARMACIST)
INSERT INTO rbac_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM rbac_roles r, rbac_menus m 
WHERE r.name = 'PHARMACIST' AND m.label IN ('Dashboard', 'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue');

-- Role-Menu Mappings (LAB_TECH)
INSERT INTO rbac_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM rbac_roles r, rbac_menus m 
WHERE r.name = 'LAB_TECH' AND m.label IN ('Dashboard', 'Laboratory');

-- Role-Menu Mappings (SUPPORT)
INSERT INTO rbac_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM rbac_roles r, rbac_menus m 
WHERE r.name = 'SUPPORT' AND m.label IN ('Dashboard', 'OPD Registration', 'Invoicing & Billing');

-- Permissions Registry
INSERT INTO rbac_permissions (key, description) VALUES
('PATIENT_PII_VIEW_FULL', 'Ability to view unmasked patient contact info'),
('PATIENT_PII_VIEW_MASKED', 'View masked patient contact info (last 4 digits only)'),
('STAFF_MANAGE', 'Ability to add, edit or remove staff members'),
('MASTERS_MANAGE', 'Ability to manage hospital master data (Depts, Services, etc.)'),
('LAB_MANAGE', 'Ability to process lab orders and enter results'),
('PHARMACY_MANAGE', 'Ability to manage inventory and dispense medications'),
('IPD_MANAGE', 'Ability to manage bed assignments and IPD admissions'),
('BILLING_MANAGE', 'Ability to generate invoices and process payments');

-- Assign Permissions to ADMIN (ALL)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'ADMIN';

-- Assign Permissions to DOCTOR
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'DOCTOR' AND p.key IN ('PATIENT_PII_VIEW_FULL', 'LAB_MANAGE', 'PHARMACY_MANAGE', 'IPD_MANAGE');

-- Assign Permissions to PHARMACIST
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'PHARMACIST' AND p.key IN ('PHARMACY_MANAGE');

-- Assign Permissions to LAB_TECH
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'LAB_TECH' AND p.key IN ('LAB_MANAGE');

-- Assign Permissions to SUPPORT
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'SUPPORT' AND p.key IN ('PATIENT_PII_VIEW_MASKED', 'MASTERS_MANAGE', 'BILLING_MANAGE');

-- ================= IPD ADMISSIONS =================
...

DROP TABLE IF EXISTS beds CASCADE;
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID REFERENCES wards(id),
  bed_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Vacant', -- Vacant | Occupied | Maintenance
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS ipd_admissions CASCADE;
CREATE TABLE ipd_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  bed_id UUID REFERENCES beds(id),
  ward_id UUID REFERENCES wards(id),
  encounter_id UUID REFERENCES encounters(id),
  admitting_doctor_id UUID REFERENCES users(id),
  admission_reason TEXT,
  daily_charge NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active', -- Active | Discharged
  admitted_at TIMESTAMP DEFAULT NOW(),
  discharged_at TIMESTAMP
);

DROP TABLE IF EXISTS ipd_notes CASCADE;
CREATE TABLE ipd_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES ipd_admissions(id),
  doctor_id UUID REFERENCES users(id),
  note_text TEXT,
  note_type VARCHAR(50) DEFAULT 'Progress', -- Progress | Nursing | Discharge Summary
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= SEED DATA: IPD CARE CATEGORIES =================
INSERT INTO wards (name, floor, type, capacity, base_charge) VALUES
('Emergency Triage', 'Ground Floor', 'Emergency', 10, 2500),
('Critical Care ICU', '1st Floor', 'ICU', 8, 6000),
('Special Care Wing', '2nd Floor', 'Special Care', 15, 4000),
('Regular Medical Ward', '3rd Floor', 'Regular Care', 25, 1500),
('Surgical Recovery', '2nd Floor', 'Regular Care', 20, 1800),
('Daycare Observation', 'Ground Floor', 'Daycare', 10, 900)
ON CONFLICT DO NOTHING;
