import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import PrivacyValue from "../../../components/PrivacyValue";
import { useToast } from "../../../components/ToastProvider";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  User, Activity, Pill, FlaskConical, History, 
  Plus, Trash2, CheckCircle2, ChevronRight, FileText, 
  Stethoscope, Thermometer, Droplets, Scale, Zap,
  AlertTriangle, Heart, Info, ClipboardList, Briefcase
} from 'lucide-react';

export default function OPDConsultationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const role = localStorage.getItem("role");
  const [encounter, setEncounter] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  
  // Master Data
  const [medicines, setMedicines] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  
  // Consult State
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [filteredMeds, setFilteredMeds] = useState<any[]>([]);

  const headers = { 
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    if (!role) { navigate("/"); return; }
    const data = localStorage.getItem("currentEncounter");
    if (data) {
      const enc = JSON.parse(data);
      setEncounter(enc);
      fetchPatientDetails(enc.patient_id);
    }
    fetchMasters();
  }, []);

  const fetchPatientDetails = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/patients/${id}`, { headers });
      setPatient(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMasters = async () => {
    try {
      const [medRes, disRes, diagRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/diseases`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/diagnostics`, { headers })
      ]);
      setMedicines(medRes.data);
      setDiseases(disRes.data);
      setDiagnostics(diagRes.data);
    } catch (err) { console.error(err); }
  };

  const handleMedSearch = (val: string) => {
    setMedSearch(val);
    if (val.length < 2) { setFilteredMeds([]); return; }
    const filtered = medicines.filter(m => 
      m.name.toLowerCase().includes(val.toLowerCase()) || 
      m.composition.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 8);
    setFilteredMeds(filtered);
  };

  const addMed = (m: any) => {
    setPrescriptions([...prescriptions, {
      medicine_id: m.id,
      name: m.name,
      composition: m.composition,
      dosage: '1 Tab',
      frequency: '1-0-1',
      duration: '5 Days',
      instructions: 'After Food'
    }]);
    setMedSearch("");
    setFilteredMeds([]);
  };

  const finishConsultation = async () => {
    if (!diagnosis) { showToast("Please select a diagnosis.", "error"); return; }
    setIsFinishing(true);
    try {
      await axios.put(`${API_BASE}/api/hospital/encounters/${encounter.id}`, {
        diagnosis, status: 'Completed', notes
      }, { headers });

      if (prescriptions.length > 0) {
        await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/prescriptions`, { items: prescriptions }, { headers });
      }

      if (selectedLabTests.length > 0) {
        await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/lab-orders`, { diagnosticIds: selectedLabTests }, { headers });
      }

      localStorage.removeItem("currentEncounter");
      showToast("Consultation finalized successfully.", "success");
      navigate("/tenant/opd/queue");
    } catch (err) { showToast("Failed to save consultation.", "error"); }
    finally { setIsFinishing(false); }
  };

  if (!encounter) return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px' }}>
        <Header title="Clinical Consultation War-Room" />
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 140px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="page-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '440px' }}>
            <Info size={48} style={{ color: '#94a3b8', margin: '0 auto 24px' }} />
            <h2 style={{ fontWeight: 900, margin: '0 0 12px' }}>No Active Patient</h2>
            <p style={{ color: '#64748b', marginBottom: '32px' }}>Please select a patient from your queue to begin the clinical consultation.</p>
            <button onClick={() => navigate("/tenant/opd/queue")} className="button-primary" style={{ width: '100%' }}>Return to Queue</button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px' }}>
        <Header title="Clinical Consultation War-Room" />

        {/* COMPREHENSIVE PATIENT HUD */}
        <div className="page-card" style={{ padding: '28px', borderRadius: '28px', marginBottom: '28px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
             <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' }}>
                <User size={36} />
             </div>
             <div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0f172a' }}>{encounter.patient_name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                   <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 800 }}>{encounter.mrn}</span>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>{encounter.age}Y • {encounter.gender}</span>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: '6px' }}>BLOOD: {patient?.blood_group || 'N/A'}</span>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>TOKEN #{encounter.token}</span>
                </div>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px', borderLeft: '1px solid #f1f5f9', paddingLeft: '28px' }}>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase' }}>Blood Pressure</p><div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Activity size={16} style={{ color: '#ef4444' }} /><span style={{ fontSize: '16px', fontWeight: 900 }}>{encounter.vitals?.bp || '--'}</span></div></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase' }}>Temperature</p><div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Thermometer size={16} style={{ color: '#f59e0b' }} /><span style={{ fontSize: '16px', fontWeight: 900 }}>{encounter.vitals?.temp || '--'}°F</span></div></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase' }}>Weight</p><div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Scale size={16} style={{ color: '#3b82f6' }} /><span style={{ fontSize: '16px', fontWeight: 900 }}>{encounter.vitals?.weight || '--'}kg</span></div></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase' }}>Occupation</p><div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Briefcase size={16} style={{ color: '#64748b' }} /><span style={{ fontSize: '14px', fontWeight: 800 }}>{patient?.occupation || '--'}</span></div></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* CLINICAL OBSERVATIONS */}
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
               <h3 style={{ margin: '0 0 24px', fontSize: '14px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Stethoscope size={20} /> DIAGNOSIS & CHIEF COMPLAINTS
               </h3>
               <select className="select-field" style={{ marginBottom: '20px', fontSize: '16px', height: '56px', borderRadius: '14px' }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)}>
                 <option value="">Select ICD-10 Clinical Diagnosis...</option>
                 {diseases.map(d => <option key={d.id} value={d.name}>{d.name} ({d.icd_code})</option>)}
               </select>
               <textarea 
                className="input-field" 
                placeholder="Type clinical notes, observations, or chief complaints..." 
                style={{ height: '140px', padding: '20px', borderRadius: '18px', fontSize: '15px', lineHeight: '1.6' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
               />
               <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setNotes(notes + " [ADMISSION_RECOMMENDED]")} style={{ padding: '10px 20px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>+ Recommend Admission</button>
                  <button onClick={() => setNotes(notes + " [FOLLOW_UP_7D]")} style={{ padding: '10px 20px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#3b82f6', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>+ Follow-up (7D)</button>
               </div>
            </div>

            {/* SUPERCHARGED PRESCRIPTION */}
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
               <h3 style={{ margin: '0 0 24px', fontSize: '14px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Pill size={20} /> RAPID MEDICAL PRESCRIPTION
               </h3>
               
               <div style={{ position: 'relative', marginBottom: '28px' }}>
                  <input 
                    placeholder="Search Medicines, Generics or Composition..." 
                    className="input-field high-velocity-input" 
                    style={{ paddingLeft: '52px', height: '56px', borderRadius: '16px', fontSize: '16px' }}
                    value={medSearch}
                    onChange={e => handleMedSearch(e.target.value)}
                  />
                  <Plus style={{ position: 'absolute', left: '18px', top: '18px', color: '#3b82f6' }} size={22} />
                  
                  {filteredMeds.length > 0 && (
                    <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.15)', zIndex: 10 }}>
                       {filteredMeds.map(m => (
                         <div key={m.id} onClick={() => addMed(m)} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} className="hover-light">
                            <div style={{ fontWeight: 800, fontSize: '15px' }}>{m.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{m.composition}</div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {prescriptions.map((p, i) => (
                    <div key={i} style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <span style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a' }}>{p.name}</span>
                          <button onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                          <div><label className="field-label" style={{ fontSize: '9px' }}>Dosage</label><input className="input-field" style={{ fontSize: '13px', height: '40px' }} value={p.dosage} onChange={e => { const n = [...prescriptions]; n[i].dosage = e.target.value; setPrescriptions(n); }} /></div>
                          <div><label className="field-label" style={{ fontSize: '9px' }}>Frequency</label><select className="select-field" style={{ fontSize: '13px', height: '40px' }} value={p.frequency} onChange={e => { const n = [...prescriptions]; n[i].frequency = e.target.value; setPrescriptions(n); }}><option>1-0-1</option><option>1-1-1</option><option>1-0-0</option><option>0-0-1</option><option>SOS</option></select></div>
                          <div><label className="field-label" style={{ fontSize: '9px' }}>Duration</label><input className="input-field" style={{ fontSize: '13px', height: '40px' }} value={p.duration} onChange={e => { const n = [...prescriptions]; n[i].duration = e.target.value; setPrescriptions(n); }} /></div>
                          <div><label className="field-label" style={{ fontSize: '9px' }}>Timing</label><select className="select-field" style={{ fontSize: '13px', height: '40px' }} value={p.instructions} onChange={e => { const n = [...prescriptions]; n[i].instructions = e.target.value; setPrescriptions(n); }}><option>After Food</option><option>Before Food</option></select></div>
                       </div>
                    </div>
                  ))}
                  {prescriptions.length === 0 && <p style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '24px', fontSize: '14px', fontWeight: 600 }}>Start typing in the search bar to add medications.</p>}
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* LAB INVESTIGATIONS */}
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
               <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <FlaskConical size={20} /> LAB INVESTIGATIONS
               </h3>
               <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {diagnostics.map(test => (
                    <div key={test.id} onClick={() => setSelectedLabTests(prev => prev.includes(test.id) ? prev.filter(id => id !== test.id) : [...prev, test.id])} style={{ padding: '14px', borderRadius: '14px', background: selectedLabTests.includes(test.id) ? '#3b82f6' : '#f8fafc', color: selectedLabTests.includes(test.id) ? 'white' : '#1e293b', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       {test.name}
                       {selectedLabTests.includes(test.id) && <CheckCircle2 size={16} />}
                    </div>
                  ))}
               </div>
            </div>

            {/* AI CLINICAL & MEDICAL HISTORY */}
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px', background: '#0f172a', color: 'white', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><ClipboardList size={80} /></div>
               <h3 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Zap size={16} fill="currentColor" /> CLINICAL PROFILE & HISTORY
               </h3>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, margin: '0 0 6px', textTransform: 'uppercase' }}>Known Allergies</p>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: patient?.allergies ? '#ef4444' : '#10b981' }}>{patient?.allergies || 'No known allergies reported.'}</div>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, margin: '0 0 6px', textTransform: 'uppercase' }}>Medical History</p>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', lineHeight: '1.6' }}>{patient?.medical_history || 'No previous clinical history found in registry.'}</div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 900, margin: '0 0 6px', textTransform: 'uppercase' }}>AI Risk Analysis</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>Patient profile suggests low surgical risk. Monitor BP due to age factors.</p>
                  </div>
               </div>
            </div>

            <button 
              disabled={isFinishing || !diagnosis}
              onClick={finishConsultation}
              style={{ 
                width: '100%', padding: '28px', borderRadius: '28px', border: 'none', 
                background: diagnosis ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1', 
                color: 'white', fontWeight: 900, fontSize: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)'
              }}
            >
              {isFinishing ? 'FINALIZING...' : <><CheckCircle2 size={26} /> FINISH CONSULTATION</>}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
