
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
  role VARCHAR(50) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
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
  brand_id UUID REFERENCES drug_brands(id),
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
INSERT INTO roles (name) VALUES ('admin'), ('doctor'), ('nurse'), ('receptionist'), ('pharmacist');

-- 10. Standard Clinical Treatments
INSERT INTO treatments (name, price, cpt_code, estimated_duration, description) VALUES
('General Consultation', 500, '99213', 20, 'Routine outpatient consultation'),
('Specialist Consultation', 1000, '99214', 30, 'Senior consultant review'),
('Wound Dressing', 350, '12001', 15, 'Standard surgical dressing'),
('Nebulization', 200, '94640', 15, 'Respiratory therapy session'),
('ECG Recording', 450, '93000', 10, '12-lead electrocardiogram');

-- 11. Standard Hospital Services
INSERT INTO services (name, price, category, service_code, tax_percent) VALUES
('Registration Fee', 100, 'Administrative', 'REG01', 0),
('Nursing Charges', 200, 'Clinical', 'NUR01', 0),
('Medical Report', 150, 'Administrative', 'REP01', 0),
('Pharmacy Handling', 50, 'Pharmacy', 'PHM01', 5);

-- 12. Clinical Consultation Modes
INSERT INTO consultation_modes (name, surcharge_percent, is_virtual) VALUES
('Physical Visit', 0, FALSE),
('Video Consult', 10, TRUE),
('Home Visit', 25, FALSE);

-- 13. Standard Wards
INSERT INTO wards (name, capacity, floor, type) VALUES
('General Ward - Male', 20, '1st Floor', 'General'),
('General Ward - Female', 20, '1st Floor', 'General'),
('ICU - Unit A', 8, '2nd Floor', 'Critical Care'),
('Private Deluxe', 10, '3rd Floor', 'Premium');

-- 14. Update Medicines with Inventory
UPDATE medicines SET stock_quantity = 500, unit_price = 10.50 WHERE name = 'Paracetamol 500mg';
UPDATE medicines SET stock_quantity = 250, unit_price = 45.00 WHERE name = 'Amoxicillin 250mg';
UPDATE medicines SET stock_quantity = 150, unit_price = 12.00 WHERE name = 'Metformin 500mg';

-- ================= IPD ADMISSIONS =================

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

