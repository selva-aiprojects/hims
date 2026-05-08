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
  CheckCircle2, ChevronRight, FileText, 
  Stethoscope, Thermometer, Droplets, Scale, Zap,
  AlertTriangle, Heart, Info, Briefcase, Sparkles, Brain, Loader2, Wand2
} from 'lucide-react';
import PrescriptionTab from './components/PrescriptionTab';
import LabTab from './components/LabTab';
import ClinicalHistoryTab from './components/ClinicalHistoryTab';

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
  const [activeTab, setActiveTab] = useState('prescription'); // prescription, lab, history
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  
  const getHeaders = () => ({ 
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  });

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
      const res = await axios.get(`${API_BASE}/api/patients/${id}`, { headers: getHeaders() });
      setPatient(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMasters = async () => {
    try {
      const h = getHeaders();
      const [medRes, disRes, diagRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers: h }),
        axios.get(`${API_BASE}/api/hospital/masters/diseases`, { headers: h }),
        axios.get(`${API_BASE}/api/hospital/masters/diagnostics`, { headers: h })
      ]);
      setMedicines(medRes.data || []);
      setDiseases(disRes.data || []);
      setDiagnostics(diagRes.data || []);
    } catch (err) { 
      console.error(err);
      showToast("Master data fetch failed. Some clinical dropdowns may be empty.", "warning");
    }
  };

  const handleMedSearch = (val: string) => {
    setMedSearch(val);
    if (val.length < 1) { setFilteredMeds([]); return; }
    const filtered = (medicines || []).filter(m => 
      (m.name || "").toLowerCase().includes(val.toLowerCase()) || 
      (m.composition || "").toLowerCase().includes(val.toLowerCase())
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
    if (!diagnosis) { showToast("Clinical Diagnosis is mandatory to finish.", "error"); return; }
    setIsFinishing(true);
    const h = getHeaders();
    try {
      // 1. Save Encounter Main Data
      await axios.put(`${API_BASE}/api/hospital/encounters/${encounter.id}`, {
        diagnosis, status: 'Completed', notes
      }, { headers: h });

      // 2. Save Prescriptions (Sequential but tolerant)
      if (prescriptions.length > 0) {
        try {
          await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/prescriptions`, { items: prescriptions }, { headers: h });
        } catch (e) { console.warn("Prescription save failed", e); }
      }

      // 3. Save Lab Orders
      if (selectedLabTests.length > 0) {
        try {
          await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/lab-orders`, { diagnosticIds: selectedLabTests }, { headers: h });
        } catch (e) { console.warn("Lab order save failed", e); }
      }

      localStorage.removeItem("currentEncounter");
      showToast("Consultation Finalized successfully.", "success");
      navigate("/tenant/opd/queue");
    } catch (err: any) { 
      const msg = err.response?.data?.message || err.message || "Failed to save consultation.";
      showToast(msg, "error"); 
    }
    finally { setIsFinishing(false); }
  };

  const getAiAdvice = async () => {
    if (!notes && !encounter.complaints) {
      showToast("Please enter patient complaints or notes first.", "error");
      return;
    }
    setIsAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await axios.post(`${API_BASE}/api/consultations/ai-suggest`, {
        patientId: patient.id,
        complaints: notes || encounter.complaints
      }, { headers: getHeaders() });
      setAiAdvice(res.data);
    } catch (err: any) {
      if (err.response?.status === 429) {
        showToast("AI limit reached. Please wait 30 seconds.", "warning");
        setAiAdvice({ error: "LIMIT", message: "Maximum clinical AI capacity reached for this minute. Please pause for 30 seconds before retry." });
      } else {
        console.error(err);
        showToast("AI Advice unavailable right now.", "error");
        setAiAdvice({ error: "FAILED", message: "The clinical AI is temporarily unreachable. Please check your internet connection or try again in a moment." });
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAiAdvice = () => {
    if (!aiAdvice) return;
    
    if (aiAdvice.suggested_diagnosis) {
      setDiagnosis(aiAdvice.suggested_diagnosis);
    }
    
    if (aiAdvice.proposed_medicines && aiAdvice.proposed_medicines.length > 0) {
      const newPrescriptions = [...prescriptions];
      aiAdvice.proposed_medicines.forEach((m: any) => {
        const sysMed = medicines.find(sm => (sm.name || "").toLowerCase().includes((m.name || "").toLowerCase()));
        newPrescriptions.push({
          medicine_id: sysMed?.id || null,
          name: m.name,
          dosage: m.dosage || '1 Tab',
          frequency: m.frequency || '1-0-1',
          duration: m.duration || '5 Days',
          instructions: m.instructions || 'After Food'
        });
      });
      setPrescriptions(newPrescriptions);
    }
    
    if (aiAdvice.proposed_tests && aiAdvice.proposed_tests.length > 0) {
      const newTests = [...selectedLabTests];
      aiAdvice.proposed_tests.forEach((testName: string) => {
        const sysTest = diagnostics.find(sd => (sd.name || "").toLowerCase().includes(testName.toLowerCase()));
        if (sysTest && !newTests.includes(sysTest.id)) {
          newTests.push(sysTest.id);
        }
      });
      setSelectedLabTests(newTests);
    }

    // Append AI reasoning/advice to notes
    let newNotes = notes;
    if (aiAdvice.reasoning || aiAdvice.clinical_advice) {
      newNotes += `\n\n--- AI CLINICAL NOTE ---\n${aiAdvice.clinical_advice || ''}\nReasoning: ${aiAdvice.reasoning || ''}`;
      setNotes(newNotes.trim());
    }
    
    showToast("AI proposal successfully applied to consultation.", "success");
    setShowAiPanel(false);
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
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                 <select className="select-field" style={{ flex: 1, margin: 0, fontSize: '16px', height: '56px', borderRadius: '14px' }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)}>
                   <option value="">Select ICD-10 Clinical Diagnosis...</option>
                   {diseases.map(d => <option key={d.id} value={d.name}>{d.name} ({d.icd_code})</option>)}
                 </select>
                 <button 
                  onClick={getAiAdvice}
                  disabled={isAiLoading}
                  style={{ 
                    height: '56px', padding: '0 24px', borderRadius: '14px', border: 'none', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
                    color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', 
                    cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                  }}
                 >
                   {isAiLoading ? <Loader2 className="animate-spin" /> : <Brain size={20} />}
                   AI ADVISOR
                 </button>
               </div>

               {showAiPanel && (
                 <div style={{ 
                   marginBottom: '20px', padding: '24px', borderRadius: '20px', 
                   background: '#f5f3ff', border: '1px solid #ddd6fe', position: 'relative',
                   animation: 'slideDown 0.3s ease-out'
                 }}>
                   <button onClick={() => setShowAiPanel(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', color: '#7c3aed', cursor: 'pointer', fontWeight: 800 }}>CLOSE</button>
                   <h4 style={{ margin: '0 0 16px', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 900 }}>
                     <Sparkles size={18} /> AI CLINICAL PROPOSAL
                   </h4>
                   
                   {isAiLoading ? (
                     <div style={{ padding: '20px', textAlign: 'center', color: '#7c3aed' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontWeight: 700 }}>Synthesizing clinical advice based on history...</p>
                     </div>
                   ) : aiAdvice?.error === 'LIMIT' ? (
                     <div style={{ padding: '20px', textAlign: 'center', color: '#991b1b' }}>
                        <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontWeight: 800 }}>{aiAdvice.message}</p>
                        <button onClick={getAiAdvice} style={{ marginTop: '16px', padding: '8px 16px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Retry Now</button>
                     </div>
                   ) : aiAdvice ? (
                     <div>
                       <div style={{ marginBottom: '16px' }}>
                         <p style={{ fontSize: '12px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>Suggested Diagnosis</p>
                         <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e1b4b' }}>{aiAdvice.suggested_diagnosis}</p>
                         <p style={{ fontSize: '13px', color: '#6d28d9', marginTop: '4px', fontStyle: 'italic' }}>{aiAdvice.reasoning}</p>
                       </div>
                       
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>Proposed Meds</p>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {aiAdvice.proposed_medicines?.map((m: any, i: number) => (
                                <li key={i} style={{ fontSize: '13px', fontWeight: 600, color: '#4c1d95', marginBottom: '2px' }}>• {m.name} ({m.dosage})</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>Proposed Tests</p>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {aiAdvice.proposed_tests?.map((t: string, i: number) => (
                                <li key={i} style={{ fontSize: '13px', fontWeight: 600, color: '#4c1d95', marginBottom: '2px' }}>• {t}</li>
                              ))}
                            </ul>
                          </div>
                       </div>
                       
                       <button 
                        onClick={applyAiAdvice}
                        style={{ 
                          width: '100%', padding: '14px', borderRadius: '12px', border: 'none', 
                          background: '#7c3aed', color: 'white', fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                       >
                         <Wand2 size={18} /> ACCEPT & APPLY AI PROPOSAL
                       </button>
                     </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#7c3aed' }}>
                         <AlertTriangle size={32} style={{ margin: '0 auto 12px', color: '#ef4444' }} />
                         <p style={{ fontWeight: 800, color: '#1e1b4b' }}>{aiAdvice?.message || "Failed to generate clinical suggestions."}</p>
                         <p style={{ fontSize: '13px', marginTop: '8px', color: '#64748b' }}>Try adding more clinical observations or symptoms in the notes box below.</p>
                         <button onClick={getAiAdvice} style={{ marginTop: '16px', padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
                      </div>
                    )}
                 </div>
               )}

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

            {/* TABBED CLINICAL INTERFACE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '4px', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('prescription')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'prescription' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'prescription' ? 'white' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Pill size={18} />
                Prescription
                {prescriptions.length > 0 && (
                  <span style={{
                    background: activeTab === 'prescription' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: activeTab === 'prescription' ? 'white' : '#475569',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {prescriptions.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('lab')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'lab' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'lab' ? 'white' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <FlaskConical size={18} />
                Lab Tests
                {selectedLabTests.length > 0 && (
                  <span style={{
                    background: activeTab === 'lab' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: activeTab === 'lab' ? 'white' : '#475569',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {selectedLabTests.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'history' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'history' ? 'white' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Zap size={18} />
                Clinical History
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: '400px' }}>
              {activeTab === 'prescription' && (
                <PrescriptionTab
                  prescriptions={prescriptions}
                  setPrescriptions={setPrescriptions}
                  medicines={medicines}
                  medSearch={medSearch}
                  setMedSearch={setMedSearch}
                  filteredMeds={filteredMeds}
                  handleMedSearch={handleMedSearch}
                  addMed={addMed}
                />
              )}
              
              {activeTab === 'lab' && (
                <LabTab
                  diagnostics={diagnostics}
                  selectedLabTests={selectedLabTests}
                  setSelectedLabTests={setSelectedLabTests}
                />
              )}
              
              {activeTab === 'history' && (
                <ClinicalHistoryTab patient={patient} />
              )}
            </div>
          </div>

            <button 
              disabled={isFinishing}
              onClick={finishConsultation}
              style={{ 
                width: '100%', padding: '28px', borderRadius: '28px', border: 'none', 
                background: diagnosis ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', 
                color: 'white', fontWeight: 900, fontSize: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
                boxShadow: diagnosis ? '0 20px 40px rgba(16, 185, 129, 0.2)' : 'none',
                opacity: isFinishing ? 0.7 : 1
              }}
            >
              {isFinishing ? (
                <>
                  <Loader2 className="animate-spin" size={26} />
                  FINALIZING...
                </>
              ) : (
                <span>
                  <CheckCircle2 size={26} /> 
                  {diagnosis ? 'FINISH CONSULTATION' : 'ENTER DIAGNOSIS TO FINISH'}
                </span>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
