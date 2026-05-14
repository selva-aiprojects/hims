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
  const [showPostConsultModal, setShowPostConsultModal] = useState(false);
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // Clinical History Data
  const [pastLabs, setPastLabs] = useState<any[]>([]);
  const [pastMeds, setPastMeds] = useState<any[]>([]);
  const [isAdmissionPrescribed, setIsAdmissionPrescribed] = useState(false);
  const [admissionReason, setAdmissionReason] = useState("");

  
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
      
      // Fetch Past History
      const [labRes, medRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/lab/orders?patientId=${id}`, { headers: getHeaders() }),
        axios.get(`${API_BASE}/api/hospital/encounters?patientId=${id}&status=Completed`, { headers: getHeaders() })
      ]);
      setPastLabs(labRes.data || []);
      setPastMeds(medRes.data || []);
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

      // 4. Save Admission Recommendation
      if (isAdmissionPrescribed) {
        try {
          // Formal admission recommendation to Admission Desk
          await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/admission-recommendation`, { 
            reason: admissionReason || notes 
          }, { headers: h });
        } catch (e) { console.warn("Admission rec failed", e); }
      }

      localStorage.removeItem("currentEncounter");
      setShowPostConsultModal(true);
    } catch (err: any) { 
      const msg = err.response?.data?.message || err.message || "Failed to save consultation.";
      showToast(msg, "error"); 
    }
    finally { setIsFinishing(false); }
  };

  const handlePostConsultClose = () => {
    setShowPostConsultModal(false);
    navigate("/tenant/opd/queue");
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', marginBottom: '32px', marginTop: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', color: '#3b82f6', display: 'grid', placeItems: 'center', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)' }}>
            <Stethoscope size={24} />
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Clinical Decision Hub</p>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: 500, maxWidth: '600px' }}>Unified command interface for clinical diagnosis, AI-assisted prescription, and diagnostic orders.</p>
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '28px' }}>
          
          {/* LEFT COLUMN: OBSERVATIONS & FINISH BUTTON */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* CLINICAL OBSERVATIONS */}
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
               <h3 style={{ margin: '0 0 24px', fontSize: '14px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Stethoscope size={20} /> DIAGNOSIS & CHIEF COMPLAINTS
               </h3>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                 <div style={{ flex: 1, position: 'relative' }}>
                   <input 
                    className="input-field" 
                    placeholder="Enter Clinical Diagnosis or select from ICD-10..." 
                    style={{ 
                      margin: 0, fontSize: '16px', height: '56px', borderRadius: '14px', paddingRight: '40px',
                      border: !diagnosis ? '2px solid #fed7aa' : '2px solid #e2e8f0',
                      background: !diagnosis ? '#fffaf5' : 'white'
                    }} 
                    value={diagnosis} 
                    onChange={e => setDiagnosis(e.target.value)}
                   />
                   <select 
                    style={{ position: 'absolute', right: '10px', top: '16px', opacity: 0.1, width: '30px', cursor: 'pointer' }} 
                    onChange={e => { if (e.target.value) setDiagnosis(e.target.value); }}
                   >
                     <option value="">Quick Select...</option>
                     {diseases.map(d => <option key={d.id} value={d.name}>{d.name} ({d.icd_code})</option>)}
                   </select>
                   <div style={{ position: 'absolute', right: '14px', top: '18px', pointerEvents: 'none', color: '#64748b' }}>
                     <ChevronRight size={20} />
                   </div>
                 </div>
               </div>

               <button 
                onClick={getAiAdvice}
                disabled={isAiLoading}
                style={{ 
                  width: '100%', height: '56px', padding: '0 24px', borderRadius: '14px', border: 'none', 
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
                  color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                  cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
                  marginBottom: '20px'
                }}
               >
                 {isAiLoading ? <Loader2 className="animate-spin" /> : <Brain size={20} />}
                 AI ADVISOR
               </button>

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
                       
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
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
                         <Wand2 size={18} /> ACCEPT & APPLY PROPOSAL
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
               <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      setIsAdmissionPrescribed(true);
                      setAdmissionReason("Acute clinical condition requiring IPD monitoring");
                      setNotes(notes + " [IPD_ADMISSION_ORDERED]");
                    }} 
                    style={{ 
                      padding: '10px 20px', borderRadius: '12px', 
                      background: isAdmissionPrescribed ? '#fbbf24' : '#fff7ed', 
                      border: '1px solid #ffedd5', color: isAdmissionPrescribed ? 'white' : '#c2410c', 
                      fontSize: '13px', fontWeight: 800, cursor: 'pointer', flex: 1,
                      boxShadow: isAdmissionPrescribed ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                    }}
                  >
                    {isAdmissionPrescribed ? '✅ Admission Prescribed' : '+ IPD Admission'}
                  </button>
                  <button onClick={() => setNotes(notes + " [FOLLOW_UP_7D]")} style={{ padding: '10px 20px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#3b82f6', fontSize: '13px', fontWeight: 800, cursor: 'pointer', flex: 1 }}>+ Follow-up (7D)</button>
               </div>
               {isAdmissionPrescribed && (
                 <div style={{ marginTop: '16px', padding: '16px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#854d0e', marginBottom: '8px' }}>ADMISSION REASON (FOR ADMISSION DESK)</label>
                    <input 
                      className="input-field" 
                      value={admissionReason} 
                      onChange={e => setAdmissionReason(e.target.value)}
                      placeholder="e.g. Severe Dehydration, Post-Op Care..." 
                    />
                 </div>
               )}
            </div>

            {!diagnosis && (
              <div style={{ marginBottom: '12px', padding: '12px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} style={{ color: '#c2410c' }} />
                <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>Diagnosis is required to finalize this consultation.</span>
              </div>
            )}

            <button 
              disabled={isFinishing || !diagnosis}
              onClick={finishConsultation}
              style={{ 
                width: '100%', padding: '28px', borderRadius: '28px', border: 'none', 
                background: diagnosis ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)', 
                color: 'white', fontWeight: 900, fontSize: '20px', cursor: diagnosis ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
                boxShadow: diagnosis ? '0 20px 40px rgba(16, 185, 129, 0.2)' : 'none',
                opacity: isFinishing ? 0.7 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {isFinishing ? (
                <>
                  <Loader2 className="animate-spin" size={26} />
                  FINALIZING...
                </>
              ) : (
                <span>
                  <CheckCircle2 size={26} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> 
                  {diagnosis ? 'FINISH CONSULTATION' : 'DIAGNOSIS REQUIRED'}
                </span>
              )}
            </button>
          </div>

          {/* RIGHT COLUMN: TABBED CLINICAL INTERFACE */}
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
                <ClinicalHistoryTab 
                  patient={patient} 
                  pastLabs={pastLabs}
                  pastMeds={pastMeds}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* POST-CONSULTATION ACTION SHEET */}
      {showPostConsultModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px', color: '#0f172a' }}>Consultation Finished</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Clinical encounter successfully recorded for {encounter.patient_name}.</p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Next Steps for Patient</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {prescriptions.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pill size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Pharmacy</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Pick up {prescriptions.length} prescribed medicines.</div>
                    </div>
                  </div>
                )}
                
                {selectedLabTests.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Diagnostic Lab</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Proceed for {selectedLabTests.length} ordered lab tests.</div>
                    </div>
                  </div>
                )}
                
                {isAdmissionPrescribed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Admission Desk</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Proceed for IPD admission processing.</div>
                    </div>
                  </div>
                )}

                {!prescriptions.length && !selectedLabTests.length && !isAdmissionPrescribed && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 500, fontStyle: 'italic' }}>
                    No further clinical actions required. Proceed to billing desk if applicable.
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handlePostConsultClose}
              style={{ width: '100%', padding: '20px', borderRadius: '16px', border: 'none', background: '#0f172a', color: 'white', fontSize: '16px', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              Close & Return to Queue
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
