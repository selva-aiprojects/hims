-- SHARD_Base_Schema.sql
-- Base clinical schema for new hospital shards
-- Based on the "Modern" HIMS Schema

-- Core Clinical Users (Tenant Specific)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'doctor', 'nurse', 'receptionist', 'billing'
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Patient Records
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    gender VARCHAR(10),
    age INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Encounters / Visits
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    department_id UUID, -- Optional link to departments
    weight VARCHAR(20),
    bp VARCHAR(20),
    diagnosis TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Completed', 'Cancelled'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES encounters(id),
    drug_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Billing
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    total DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Master Tables
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    hod VARCHAR(255), -- Head of Department
    specialty VARCHAR(100), -- General, Surgical, ICU, etc.
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id),
    capacity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- 'OPD', 'Lab', 'Radiology', 'Pharmacy'
    service_code VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    tax_percent DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New Master Tables: Diseases & Treatments
CREATE TABLE IF NOT EXISTS diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    icd_code VARCHAR(50), -- International Classification of Diseases
    category VARCHAR(100), -- Chronic, Acute, Infectious
    severity_level VARCHAR(50), -- Mild, Moderate, Severe
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cpt_code VARCHAR(50), -- Current Procedural Terminology
    price DECIMAL(10, 2) NOT NULL,
    estimated_duration INTEGER, -- In minutes
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clinical Medicine Master (For Doctors)
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL, -- Generic Name / Salt
    category VARCHAR(100), -- Antibiotic, Antacid, etc.
    composition TEXT, -- Ingredients
    dosage_adult TEXT, -- Standard Adult Dose
    dosage_pediatric TEXT, -- Standard Pediatric Dose
    instructions TEXT, -- "Take after food", etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart Healthcare Masters
CREATE TABLE IF NOT EXISTS specialities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    base_consultation_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL, -- Telemedicine, Virtual, Emergency, Regular
    surcharge_percent DECIMAL(5, 2) DEFAULT 0, -- e.g., 50 for 50% extra
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- --- TIER 2: LAB & PHARMACY TABLES ---

-- Laboratory Module
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES encounters(id),
    patient_id UUID REFERENCES patients(id),
    test_id UUID REFERENCES services(id), -- Points to 'Lab' category services
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Sample Collected', 'Completed'
    result_data TEXT,
    technician_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pharmacy Module
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    uom VARCHAR(50), -- Tab, Vial, ml, etc.
    instructions TEXT, -- "After food", "1-0-1", etc.
    details TEXT, -- Strength, composition
    stock_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);


-- --- SEED DATA: Day One Masters ---

-- 1. Departments
INSERT INTO departments (name, description, hod, specialty) VALUES 
('Emergency', 'Critical care and trauma services', 'Dr. Rajesh Kumar', 'Emergency Medicine'),
('Cardiology', 'Heart and cardiovascular health', 'Dr. Sarah James', 'Invasive Cardiology'),
('Pediatrics', 'Child healthcare and development', 'Dr. Amit Shah', 'Pediatric Care'),
('General Medicine', 'General physician and primary care', 'Dr. Meena Iyer', 'Internal Medicine'),
('Radiology', 'Imaging and diagnostic services', 'Dr. John Doe', 'Diagnostic Imaging'),
('Orthopaedics', 'Bone, joint and spine care', 'Dr. Nisha Patel', 'Orthopedic Surgery'),
('Obstetrics & Gynecology', 'Women''s health and maternity care', 'Dr. Kavita Sharma', 'OB/GYN'),
('Neurology', 'Brain and neurological care', 'Dr. Sanjay Menon', 'Neurology'),
('Oncology', 'Cancer diagnosis and treatment', 'Dr. Priya Nair', 'Medical Oncology'),
('ENT', 'Ear, nose and throat care', 'Dr. Arjun Rao', 'ENT')
ON CONFLICT (name) DO NOTHING;

-- 2. Common Diseases (ICD-10 Standards)
INSERT INTO diseases (name, icd_code, category, severity_level) VALUES 
('Essential hypertension', 'I10', 'Cardiovascular', 'Moderate'),
('Type 2 diabetes mellitus', 'E11', 'Endocrine', 'Moderate'),
('Acute upper respiratory infection', 'J06.9', 'Respiratory', 'Mild'),
('Dengue fever', 'A90', 'Infectious', 'Severe'),
('Urinary tract infection', 'N39.0', 'Urogenital', 'Moderate'),
('Bronchial asthma', 'J45.9', 'Respiratory', 'Moderate'),
('Acute gastroenteritis', 'A09', 'Gastrointestinal', 'Mild'),
('Osteoarthritis', 'M19.90', 'Musculoskeletal', 'Moderate'),
('Migraine', 'G43.909', 'Neurological', 'Mild'),
('Community-acquired pneumonia', 'J18.9', 'Respiratory', 'Severe'),
('Urinary tract calculus', 'N20.0', 'Urogenital', 'Moderate'),
('Iron deficiency anaemia', 'D50.9', 'Hematology', 'Mild'),
('Cholelithiasis', 'K80.20', 'Gastrointestinal', 'Moderate'),
('Acute appendicitis', 'K35.80', 'Gastrointestinal', 'Severe'),
('Hyperthyroidism', 'E05.90', 'Endocrine', 'Moderate')
ON CONFLICT (name) DO NOTHING;

-- 3. Standard Treatments (CPT Standards)
INSERT INTO treatments (name, description, cpt_code, price, estimated_duration) VALUES 
('Oxygen Therapy', 'Administration of oxygen at high concentrations', '94640', 500.00, 30),
('IV Fluid Resuscitation', 'Intravenous fluid replacement therapy', '96360', 1200.00, 60),
('Nebulization', 'Administration of medication in mist form', '94640', 350.00, 15),
('Wound Dressing', 'Cleaning and dressing of minor wounds', '97597', 450.00, 20),
('Fracture Immobilization', 'Casting or splinting of broken bones', '29065', 1800.00, 45),
('Endotracheal Intubation', 'Airway management for respiratory support', '31500', 3500.00, 30),
('Blood Transfusion', 'Red blood cell replacement therapy', '36430', 2200.00, 90),
('Ultrasound Abdomen', 'Imaging for abdominal evaluation', '76700', 1400.00, 25),
('Appendectomy', 'Surgical removal of appendix', '44950', 12000.00, 120),
('Physical Therapy Session', 'Supervised rehabilitative exercise', '97110', 800.00, 45)
ON CONFLICT (name) DO NOTHING;

-- 4. Diagnostics & Services
INSERT INTO services (name, category, service_code, price, tax_percent) VALUES 
('General Consultation', 'OPD', 'CONS-001', 500.00, 0.00),
('Specialist Consultation', 'OPD', 'CONS-002', 1000.00, 0.00),
('Senior Consultant Consultation', 'OPD', 'CONS-003', 1500.00, 0.00),
('Complete Blood Count (CBC)', 'Lab', 'LAB-001', 450.00, 5.00),
('Serum Creatinine', 'Lab', 'LAB-002', 520.00, 5.00),
('Lipid Profile', 'Lab', 'LAB-003', 900.00, 5.00),
('Chest X-Ray', 'Radiology', 'RAD-001', 850.00, 12.00),
('ECG', 'Radiology', 'RAD-002', 600.00, 5.00),
('2D Echocardiogram', 'Radiology', 'RAD-003', 2200.00, 12.00),
('MRI Brain', 'Radiology', 'RAD-004', 9500.00, 18.00),
('Ultrasound Pelvis', 'Radiology', 'RAD-005', 1200.00, 12.00),
('Wound Dressing', 'Procedure', 'PROC-001', 450.00, 0.00),
('IV Cannulation', 'Procedure', 'PROC-002', 300.00, 0.00),
('Infusion Therapy', 'Procedure', 'PROC-003', 750.00, 0.00)
ON CONFLICT (name) DO NOTHING;

-- 5. Specialities
INSERT INTO specialities (name, base_consultation_fee) VALUES 
('Cardiology', 1500.00),
('Neurology', 1800.00),
('Orthopaedics', 1200.00),
('Pediatrics', 800.00),
('General Medicine', 600.00),
('Obstetrics & Gynecology', 1400.00),
('Oncology', 2200.00),
('ENT', 900.00),
('Urology', 1300.00),
('Dermatology', 850.00)
ON CONFLICT (name) DO NOTHING;

-- 6. Consultation Modes
INSERT INTO consultation_modes (name, surcharge_percent, is_virtual) VALUES 
('Regular', 0, FALSE),
('Direct (Walk-in)', 10, FALSE),
('Emergency', 50, FALSE),
('Telemedicine', 0, TRUE),
('Virtual (Intl)', 25, TRUE),
('Home Visit', 15, FALSE)
ON CONFLICT (name) DO NOTHING;

-- 7. Pharmacy Inventory (Day One Stock)
INSERT INTO pharmacy_inventory (drug_name, category, uom, instructions, details, stock_quantity, unit_price, expiry_date) VALUES 
('Paracetamol 500mg', 'Antipyretic', 'Tablet', '1-0-1 After Food', 'For fever and pain relief', 1000, 5.00, '2026-12-31'),
('Amoxicillin 250mg', 'Antibiotic', 'Capsule', '1-1-1 After Food', 'Broad-spectrum antibiotic', 500, 12.50, '2025-06-30'),
('Metformin 500mg', 'Antidiabetic', 'Tablet', '0-0-1 Before Food', 'For blood sugar control', 2000, 8.00, '2027-03-15'),
('Amlodipine 5mg', 'Antihypertensive', 'Tablet', '1-0-0 Before Food', 'For blood pressure control', 800, 15.00, '2026-09-20'),
('Cetirizine 10mg', 'Antihistamine', 'Tablet', '0-0-1 Night', 'For allergy relief', 1200, 4.50, '2026-11-10')
ON CONFLICT (drug_name) DO NOTHING;

-- 8. Clinical Medicine Master (Seed Data for Doctors)
INSERT INTO medicines (name, category, composition, dosage_adult, dosage_pediatric, instructions) VALUES 
('Amoxicillin', 'Antibiotic', 'Amoxicillin Trihydrate', '500mg TID', '20mg/kg/day', 'Complete full course'),
('Paracetamol', 'Antipyretic', 'Acetaminophen', '650mg QID', '15mg/kg/dose', 'Take for fever > 100F'),
('Pantoprazole', 'Antacid', 'Pantoprazole Sodium', '40mg OD', 'Not recommended', 'Take 30 mins before food'),
('Metformin', 'Antidiabetic', 'Metformin Hydrochloride', '500mg BID', 'Not recommended', 'Take with meals'),
('Amlodipine', 'Antihypertensive', 'Amlodipine Besylate', '5mg OD', 'Not recommended', 'Take at same time daily')
ON CONFLICT (name) DO NOTHING;
