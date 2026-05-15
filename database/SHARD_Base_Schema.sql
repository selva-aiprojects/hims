
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
  -- Branding Settings
  primary_dark VARCHAR(50) DEFAULT '#0f172a',
  primary_accent VARCHAR(50) DEFAULT '#3b82f6',
  app_bg VARCHAR(50) DEFAULT '#f8fafc',
  text_main VARCHAR(50) DEFAULT '#1e293b',
  hero_bg VARCHAR(50) DEFAULT '#ffffff',
  hero_text VARCHAR(50) DEFAULT '#0f172a',
  logo_url TEXT,
  font_size INTEGER DEFAULT 14,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'staff', -- Legacy role fallback
  license_number VARCHAR(100),
  gender VARCHAR(20),
  dob DATE,
  age INTEGER,
  doj DATE,
  qualifications TEXT,
  experience_years INTEGER,
  specialization VARCHAR(100), -- For doctors (Department)
  department VARCHAR(100), -- For other staff
  is_active BOOLEAN DEFAULT TRUE,
  -- HIPAA Compliance Fields
  privacy_level VARCHAR(20) DEFAULT 'LIMITED', -- FULL | CLINICAL | LIMITED | ADMIN_VIEW
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
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

DROP TABLE IF EXISTS suppliers CASCADE;
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS medicines CASCADE;
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  category VARCHAR(100),
  uom VARCHAR(50) DEFAULT 'Tablet',
  batch_number VARCHAR(100),
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

DROP TABLE IF EXISTS pharmacy_inwards CASCADE;
CREATE TABLE pharmacy_inwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_no VARCHAR(50),
  supplier_id UUID REFERENCES suppliers(id),
  medicine_id UUID REFERENCES medicines(id),
  batch_number VARCHAR(100),
  invoice_number VARCHAR(100),
  quantity INTEGER DEFAULT 0,
  uom VARCHAR(50),
  purchase_price NUMERIC DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  mfd_date DATE,
  expiry_date DATE,
  received_at TIMESTAMP DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  remarks TEXT
);

DROP TABLE IF EXISTS dosage_guidelines CASCADE;

DROP TABLE IF EXISTS wards CASCADE;
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  capacity INTEGER DEFAULT 10,
  type VARCHAR(50) DEFAULT 'General',
  floor VARCHAR(20),
  base_charge NUMERIC DEFAULT 0,
  -- Age-appropriate constraints
  min_age INTEGER DEFAULT 0,
  max_age INTEGER DEFAULT 120,
  gender_restriction VARCHAR(20) DEFAULT 'Any', -- Any | Male | Female
  age_validation_required BOOLEAN DEFAULT false,
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
  email VARCHAR(255),
  blood_group VARCHAR(10),
  occupation VARCHAR(100),
  address TEXT,
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(50),
  medical_history TEXT,
  allergies TEXT,
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

DROP TABLE IF EXISTS consultation_events CASCADE;
CREATE TABLE consultation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id),
  event_type VARCHAR(50) NOT NULL, -- CHECK_IN, TRIAGE_START, CONSULT_START, PAUSE, RESUME, CONSULT_END
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS consultation_predictions CASCADE;
CREATE TABLE consultation_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id),
  predicted_time_mins INTEGER,
  complexity VARCHAR(50),
  triage_priority INTEGER,
  reasoning TEXT,
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
  visit_type VARCHAR(50),
  visit_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= DOCTOR AVAILABILITY =================
DROP TABLE IF EXISTS doctor_availability CASCADE;
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  recurring_pattern VARCHAR(100), -- daily, weekly, monthly
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(doctor_id, date, start_time)
);

-- ================= ENTERPRISE SCHEDULING =================

DROP TABLE IF EXISTS doctor_schedules CASCADE;
CREATE TABLE doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id),
  weekday INTEGER NOT NULL, -- 0-6 (Sun-Sat)
  session_name VARCHAR(100),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 30,
  consultation_type VARCHAR(50) DEFAULT 'OPD', -- OPD, VIDEO, SURGERY
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS doctor_leaves CASCADE;
CREATE TABLE doctor_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id),
  leave_type VARCHAR(50) NOT NULL, -- VACATION, SICK, EMERGENCY, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  is_emergency BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS doctor_overrides CASCADE;
CREATE TABLE doctor_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id),
  override_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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
  visit_id UUID REFERENCES visits(id),
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS prescription_items CASCADE;
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  medicine_id UUID REFERENCES medicines(id),
  drug_name VARCHAR(255),
  dosage VARCHAR(100),
  frequency VARCHAR(50),
  duration VARCHAR(50),
  instructions TEXT,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= LAB =================
DROP TABLE IF EXISTS lab_orders CASCADE;
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  diagnostic_id UUID REFERENCES diagnostics(id),
  doctor_id UUID REFERENCES users(id),
  priority VARCHAR(50) DEFAULT 'Normal',
  status VARCHAR(50) DEFAULT 'Pending',
  results JSONB,
  technician_notes TEXT,
  is_billed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
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
  discount_amount NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  source_queue_id UUID
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

-- ================= CLINICAL BILLING LEDGER =================
CREATE TABLE billing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES encounters(id),
    source_module VARCHAR(50), 
    source_id UUID,            
    description TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    tax_percent NUMERIC DEFAULT 0,
    is_discountable BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'PENDING', 
    created_at TIMESTAMP DEFAULT NOW()
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
-- 1. Departments
INSERT INTO departments (name, description, hod, specialty, status) VALUES
('General Medicine', 'Primary care and internal medicine', 'Dr. Sankaran R', 'Internal Medicine', 'Active'),
('Cardiology', 'Heart and vascular care', 'Dr. Maheswaran R', 'Cardiologist', 'Active'),
('Pediatrics', 'Child health and development', 'Dr. Aravind Kumar', 'Pediatrician', 'Active'),
('Orthopedics', 'Bone and joint care', 'Dr. Brown', 'Orthopedic Surgeon', 'Active'),
('Emergency & Trauma', '24/7 Critical care', 'Dr. Wilson', 'Emergency Medicine', 'Active'),
('Laboratory', 'Diagnostic testing and pathology', 'Alice LabTech', 'Pathology', 'Active'),
('Pharmacy', 'Medicine dispensing', 'John Pharmacist', 'Pharmacology', 'Active');

-- 2. Staff (Doctors, Nurses, Techs) - password123 (hashed)
-- Note: In production, these should be created via the Register Staff UI
INSERT INTO users (name, email, password_hash, role, specialization, department, is_active) VALUES
('Dr. Sankaran R', 'sankaran@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'DOCTOR', 'Cardiology', 'Cardiology', true),
('Dr. Maheswaran R', 'maheswaran@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'DOCTOR', 'Orthopedics', 'Orthopedics', true),
('Dr. Aravind Kumar', 'aravind@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'DOCTOR', 'Pediatrics', 'Pediatrics', true),
('Nurse Clara Barton', 'clara@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'NURSE', NULL, 'General Ward', true),
('Nurse Florence N', 'florence@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'NURSE', NULL, 'ICU', true),
('John Pharmacist', 'pharmacy@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'PHARMACIST', NULL, 'Pharmacy', true),
('Alice LabTech', 'lab@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'LAB_TECH', NULL, 'Laboratory', true),
('Receptionist Sarah', 'reception@apollo.com', '$2a$10$w0M9u9PqR.y.h7p.vO0S.e6O9Yq.O9Yq.O9Yq.O9Yq.O9Yq.O9Yq', 'RECEPTIONIST', NULL, 'Front Desk', true);

-- 3. Specialities
INSERT INTO specialities (name, base_consultation_fee, description) VALUES
('General Physician', 500, 'Primary consultation for all ailments'),
('Senior Cardiologist', 1500, 'Expert cardiac care and consultation'),
('Pediatric Surgeon', 1200, 'Surgical care for children'),
('Orthopedic Consultant', 1000, 'Bone and joint specialist');

-- 4. Sample Patients
INSERT INTO patients (name, mrn, gender, age, phone, email, blood_group) VALUES
('Sankaran R', 'MRN-2405-000001', 'Male', 45, '9840012345', 'sankaran@demo.com', 'O+'),
('Maheswaran R', 'MRN-2405-000002', 'Male', 52, '9840054321', 'mahesh@demo.com', 'A+'),
('Priyanka Sharma', 'MRN-2405-000003', 'Female', 29, '9840099887', 'priyanka@demo.com', 'B+'),
('Rahul Dravid', 'MRN-2405-000004', 'Male', 48, '9840011223', 'rahul@demo.com', 'O-'),
('Anjali Menon', 'MRN-2405-000005', 'Female', 34, '9840044556', 'anjali@demo.com', 'AB+');

-- 5. Wards & Beds (Full Infrastructure)
-- General Ward
INSERT INTO wards (id, name, type, capacity, base_charge, floor) 
VALUES ('w-gen-1', 'General Ward - A', 'Regular Care', 20, 1500, '2nd Floor');

INSERT INTO beds (ward_id, bed_number, status)
SELECT 'w-gen-1', 'GW-A-' || lpad(s::text, 2, '0'), 'Vacant'
FROM generate_series(1, 20) s;

-- ICU
INSERT INTO wards (id, name, type, capacity, base_charge, floor) 
VALUES ('w-icu-1', 'Critical Care Unit (ICU)', 'ICU', 10, 7500, '1st Floor');

INSERT INTO beds (ward_id, bed_number, status)
SELECT 'w-icu-1', 'ICU-' || lpad(s::text, 2, '0'), 'Vacant'
FROM generate_series(1, 10) s;

-- Private
INSERT INTO wards (id, name, type, capacity, base_charge, floor) 
VALUES ('w-pri-1', 'Premium Private Wing', 'Special Care', 15, 4500, '3rd Floor');

INSERT INTO beds (ward_id, bed_number, status)
SELECT 'w-pri-1', 'PVT-' || lpad(s::text, 2, '0'), 'Vacant'
FROM generate_series(1, 15) s;

-- 6. Services & Masters
INSERT INTO consultation_modes (name, surcharge_percent, is_virtual) VALUES
('In-Person', 0, FALSE),
('Video Call', 10, TRUE),
('Emergency Home Visit', 50, FALSE);

INSERT INTO diagnostics (name, price) VALUES 
('Complete Blood Count (CBC)', 450),
('Chest X-Ray', 800),
('Lipid Profile', 1200),
('MRI Brain (Plain)', 8500),
('ECG (Resting)', 350),
('Blood Sugar (Fasting)', 150);

INSERT INTO treatments (name, price, category, description, estimated_duration) VALUES
('Wound Dressing', 200, 'Minor Procedure', 'Cleaning and dressing of minor wounds', 15),
('Physiotherapy Session', 800, 'Therapy', '30-minute physical therapy session', 30),
('IV Infusion Charge', 1200, 'Nursing', 'Administration of IV fluids', 60);

INSERT INTO medicines (name, category, stock_quantity, unit_price, is_active) VALUES
('Paracetamol 500mg', 'Tablet', 500, 5, true),
('Amoxicillin 250mg', 'Antibiotic', 200, 15, true),
('Insulin Glargine', 'Injectable', 45, 850, true),
('Ibuprofen 400mg', 'NSAID', 350, 8, true),
('Cetirizine 10mg', 'Antihistamine', 150, 4, true),
('Pantoprazole 40mg', 'Antacid', 400, 12, true);

-- RBAC BOOTSTRAP SEEDING - HIPAA Compliant Roles
INSERT INTO rbac_roles (name, description) VALUES 
('ADMIN', 'Full system access with PII masking for audit purposes'),
('DOCTOR', 'Clinical access to full patient information for treatment'),
('NURSE', 'Clinical access to patient information for care delivery'),
('PHARMACIST', 'Access to pharmacy functions with masked patient PII'),
('LAB_ASSISTANT', 'Access to laboratory functions with masked patient PII'),
('RECEPTIONIST', 'Front desk access with limited patient PII'),
('SUPPORT', 'Administrative support with masked patient PII');

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

-- HIPAA Compliant Permissions Registry
INSERT INTO rbac_permissions (key, description) VALUES
('PATIENT_PII_VIEW_FULL', 'Ability to view complete unmasked patient information'),
('PATIENT_PII_VIEW_MASKED', 'Ability to view masked patient information (limited PII)'),
('PATIENT_PII_VIEW_DEIDENTIFIED', 'Ability to view de-identified patient information only'),
('CLINICAL_ACCESS_FULL', 'Full clinical access including diagnosis, prescriptions, vitals'),
('CLINICAL_ACCESS_LIMITED', 'Limited clinical access with PII masking'),
('PHARMACY_ACCESS_FULL', 'Full pharmacy access including patient PII'),
('PHARMACY_ACCESS_MASKED', 'Pharmacy access with masked patient PII'),
('LAB_ACCESS_FULL', 'Full laboratory access including patient PII'),
('LAB_ACCESS_MASKED', 'Laboratory access with masked patient PII'),
('FRONT_DESK_ACCESS_FULL', 'Full front desk access including patient PII'),
('FRONT_DESK_ACCESS_MASKED', 'Front desk access with masked patient PII'),
('USER_MANAGE', 'Ability to manage user accounts and roles'),
('ROLE_MANAGE', 'Ability to manage role assignments and permissions'),
('SYSTEM_CONFIG', 'Ability to modify system settings and configurations'),
('AUDIT_VIEW', 'Ability to view audit logs and compliance reports'),
('DATA_EXPORT', 'Ability to export system data (with compliance checks)'),
('BILLING_ACCESS_FULL', 'Full access to billing and financial information'),
('BILLING_ACCESS_MASKED', 'Limited billing access with PII masking'),
('IPD_MANAGE', 'Ability to manage IPD admissions and bed assignments'),
('EMERGENCY_OVERRIDE', 'Ability to override access controls in emergency situations');

-- Assign Permissions to ADMIN (ALL)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'ADMIN';

-- Assign Permissions to DOCTOR (Full Clinical Access)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'DOCTOR' AND p.key IN ('CLINICAL_ACCESS_FULL', 'PATIENT_PII_VIEW_FULL', 'LAB_MANAGE', 'PHARMACY_MANAGE', 'IPD_MANAGE')
ON CONFLICT DO NOTHING;

-- Assign Permissions to NURSE (Clinical Access with PII)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'NURSE' AND p.key IN ('CLINICAL_ACCESS_FULL', 'PATIENT_PII_VIEW_FULL', 'IPD_MANAGE')
ON CONFLICT DO NOTHING;

-- Assign Permissions to PHARMACIST (Pharmacy with PII)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'PHARMACIST' AND p.key IN ('PHARMACY_ACCESS_FULL', 'PATIENT_PII_VIEW_FULL', 'BILLING_ACCESS_FULL')
ON CONFLICT DO NOTHING;

-- Assign Permissions to LAB_ASSISTANT (Lab with PII)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'LAB_ASSISTANT' AND p.key IN ('LAB_ACCESS_FULL', 'PATIENT_PII_VIEW_FULL', 'BILLING_ACCESS_FULL')
ON CONFLICT DO NOTHING;

-- Assign Permissions to RECEPTIONIST (Front Desk with Limited PII)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'RECEPTIONIST' AND p.key IN ('FRONT_DESK_ACCESS_MASKED', 'PATIENT_PII_VIEW_MASKED', 'BILLING_ACCESS_MASKED')
ON CONFLICT DO NOTHING;

-- Assign Permissions to SUPPORT (Admin with Masked PII)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p 
WHERE r.name = 'SUPPORT' AND p.key IN ('USER_MANAGE', 'ROLE_MANAGE', 'SYSTEM_CONFIG', 'AUDIT_VIEW', 'PATIENT_PII_VIEW_MASKED')
ON CONFLICT DO NOTHING;

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
  discharged_at TIMESTAMP,
  -- Age validation constraints
  age_appropriate BOOLEAN DEFAULT true,
  validation_warnings TEXT[] DEFAULT '{}',
  validated_by UUID REFERENCES users(id)
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

-- HIPAA Compliance Audit Trail
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, VIEW_PATIENT, MODIFY_PATIENT, DELETE_PATIENT, ACCESS_DENIED, ROLE_CHANGE, EXPORT_DATA
  resource VARCHAR(255) NOT NULL, -- /patient/123, /user-management, etc.
  resource_id UUID, -- ID of the accessed resource
  details TEXT, -- Details of the action
  ip_address INET, -- User IP address
  user_agent TEXT, -- Browser user agent
  risk_level VARCHAR(20) DEFAULT 'LOW', -- LOW | MEDIUM | HIGH
  pii_accessed VARCHAR(500), -- What PII was accessed
  compliance_violation BOOLEAN DEFAULT FALSE, -- Whether HIPAA rules were violated
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================= SEED DATA: IPD CARE CATEGORIES =================
INSERT INTO wards (name, floor, type, capacity, base_charge, min_age, max_age, gender_restriction, age_validation_required) VALUES
('Emergency Triage', 'Ground Floor', 'Emergency', 10, 2500, 0, 120, 'Any', true),
('Critical Care ICU', '1st Floor', 'ICU', 8, 6000, 18, 120, 'Any', true),
('Special Care Wing', '2nd Floor', 'Special Care', 15, 4000, 0, 120, 'Any', true),
('Regular Medical Ward', '3rd Floor', 'Regular Care', 25, 1500, 12, 65, 'Any', false),
('Surgical Recovery', '2nd Floor', 'Regular Care', 20, 1800, 12, 65, 'Any', false),
('Pediatric Daycare', 'Ground Floor', 'Daycare', 10, 900, 0, 12, 'Any', true)
ON CONFLICT DO NOTHING;

-- ================= AUTOMATION & TRIGGERS =================

-- 1. Automated Age Calculation Trigger
CREATE OR REPLACE FUNCTION calculate_age_from_dob()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob IS NOT NULL THEN
        NEW.age := EXTRACT(YEAR FROM AGE(NEW.dob));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_user_age ON users;
CREATE TRIGGER trg_calculate_user_age
BEFORE INSERT OR UPDATE OF dob ON users
FOR EACH ROW EXECUTE FUNCTION calculate_age_from_dob();

DROP TRIGGER IF EXISTS trg_calculate_patient_age ON patients;
CREATE TRIGGER trg_calculate_patient_age
BEFORE INSERT OR UPDATE OF dob ON patients
FOR EACH ROW EXECUTE FUNCTION calculate_age_from_dob();

-- 2. Automated Updated At Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to core tables
DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_patients_modtime ON patients;
CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_encounters_modtime ON encounters;
CREATE TRIGGER update_encounters_modtime BEFORE UPDATE ON encounters FOR EACH ROW EXECUTE FUNCTION update_modified_column();
