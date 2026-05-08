import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import PrivacyValue from "../../../components/PrivacyValue";
import { useToast } from "../../../components/ToastProvider";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  Search, UserPlus, Zap, Activity, Clock, 
  CheckCircle2, Users, ArrowRight, Save, Trash2, User,
  Calendar, Phone, Mail, MapPin, Shield, HeartPulse, Briefcase, Scale
} from 'lucide-react';

export default function OPDRegistrationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showFullReg, setShowFullReg] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize with a fallback doctor so the user is NEVER blocked
  const [doctors, setDoctors] = useState<any[]>([
    { id: 'emerg-01', name: 'Clinical Duty Officer', specialization: 'Emergency Desk' }
  ]);
  const [recentQueue, setRecentQueue] = useState<any[]>([]);

  // Comprehensive Form State
  const [regData, setRegData] = useState({ 
    name: '', phone: '', email: '', dob: '', gender: 'Male', 
    blood_group: '', occupation: '', address: '', 
    guardian_name: '', guardian_phone: '', medical_history: '', allergies: '' 
  });
  const [vitals, setVitals] = useState({ weight: '', bp: '', temp: '', height: '' });
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const getHeaders = () => ({ 
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  });

  const fetchInitialData = async () => {
    const h = getHeaders();
    // Fetch doctors independently
    try {
      const docRes = await axios.get(`${API_BASE}/api/hospital/doctors`, { headers: h });
      if (docRes.data && docRes.data.length > 0) {
        setDoctors(docRes.data);
      }
    } catch (err) { console.error("Doctor fetch failed", err); }

    // Fetch queue independently
    try {
      const queueRes = await axios.get(`${API_BASE}/api/hospital/encounters?status=Draft`, { headers: h });
      setRecentQueue((queueRes.data || []).slice(0, 5));
    } catch (err) { console.error("Queue fetch failed", err); }
  };

  const handleLiveSearch = async (val: string) => {
    setSearchTerm(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/patients?search=${val}`, { headers: getHeaders() });
      setSearchResults(res.data);
      
      // AUTO-FILL LOGIC
      if (res.data.length === 0) {
        setShowFullReg(true);
        const isPhone = /^\d+$/.test(val);
        if (isPhone) {
          setRegData(prev => ({ ...prev, phone: val, name: prev.name }));
        } else {
          setRegData(prev => ({ ...prev, name: val, phone: prev.phone }));
        }
      } else {
        setShowFullReg(false);
      }
    } catch (err) { console.error(err); }
  };

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setSearchResults([]);
    setSearchTerm(p.name);
    setRegData({
      name: p.name || '',
      phone: p.phone || '',
      email: p.email || '',
      dob: p.dob ? p.dob.split('T')[0] : '',
      gender: p.gender || 'Male',
      blood_group: p.blood_group || '',
      occupation: p.occupation || '',
      address: p.address || '',
      guardian_name: p.guardian_name || '',
      guardian_phone: p.guardian_phone || '',
      medical_history: p.medical_history || '',
      allergies: p.allergies || ''
    });
    setShowFullReg(true);
  };

  const registerAndQueue = async () => {
    if (!regData.name || !regData.phone || !selectedDoctorId) {
      showToast("Basic info (Name, Phone) and Doctor selection are mandatory.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const pRes = await axios.post(`${API_BASE}/api/patients`, regData, { headers: getHeaders() });
      const patientId = pRes.data.id;

      await axios.post(`${API_BASE}/api/hospital/encounters`, {
        patientId,
        doctorId: selectedDoctorId,
        type: 'OPD',
        vitals,
        complaints: regData.medical_history || 'Routine Checkup'
      }, { headers: getHeaders() });

      resetFlow("Registration Successful! Patient is now in queue.");
    } catch (err: any) { 
      const msg = err.response?.data?.message || err.message || "Registration failed.";
      showToast(msg, "error"); 
    }
    finally { setIsProcessing(false); }
  };

  const queueExistingPatient = async () => {
    if (!selectedPatient || !selectedDoctorId) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API_BASE}/api/hospital/encounters`, {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        type: 'OPD',
        vitals,
        complaints: 'Follow-up Consultation'
      }, { headers: getHeaders() });
      resetFlow("Visit generated. Token issued.");
    } catch (err) { showToast("Failed to issue token.", "error"); }
    finally { setIsProcessing(false); }
  };

  const resetFlow = (msg: string) => {
    showToast(msg, "success");
    setSelectedPatient(null);
    setSearchTerm("");
    setRegData({ 
        name: '', phone: '', email: '', dob: '', gender: 'Male', 
        blood_group: '', occupation: '', address: '', 
        guardian_name: '', guardian_phone: '', medical_history: '', allergies: '' 
    });
    setVitals({ weight: '', bp: '', temp: '', height: '' });
    setSelectedDoctorId("");
    setShowFullReg(false);
    fetchInitialData();
  };

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px' }}>
        <Header title="OPD Professional Intake Desk" />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '28px' }}>
          
          {/* LEFT: UNIFIED INTAKE CONSOLE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
              <h3 style={{ margin: '0 0 24px', fontSize: '13px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} /> 1. IDENTIFY OR REGISTER PATIENT
              </h3>
              
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <input 
                  placeholder="Type Phone, Name or MRN to begin..." 
                  className="input-field high-velocity-input" 
                  style={{ paddingLeft: '52px', fontSize: '16px', height: '60px', borderRadius: '18px', border: '2px solid #e2e8f0' }}
                  value={searchTerm}
                  onChange={e => handleLiveSearch(e.target.value)}
                />
                <Search style={{ position: 'absolute', left: '18px', top: '20px', color: '#3b82f6' }} size={22} />
              </div>

              {/* SEARCH RESULTS */}
              {searchResults.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 12px 20px -5px rgba(0,0,0,0.1)' }}>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      style={{ 
                        width: '100%',
                        padding: '16px 24px', 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        textAlign: 'left'
                      }}
                      className="hover-light"
                    >
                       <div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{p.mrn} • {p.phone} • {p.blood_group || 'N/A'}</div>
                       </div>
                       <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>SELECT</div>
                    </button>
                  ))}
                </div>
              )}

              {/* FULL REGISTRATION FORM (The "Clean" Expanded View) */}
              {(showFullReg || (searchTerm && searchResults.length === 0)) && (
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={16} /> NEW PATIENT PROFILE
                      </div>
                      <button onClick={() => setShowFullReg(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={16} /></button>
                   </div>

                   {/* Personal Section */}
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div className="input-group">
                         <label className="field-label">Full Name*</label>
                         <input className="input-field" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                      </div>
                      <div className="input-group">
                         <label className="field-label">Phone Number*</label>
                         <input className="input-field" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                      </div>
                      <div className="input-group">
                         <label className="field-label">Date of Birth</label>
                         <input type="date" className="input-field" value={regData.dob} onChange={e => setRegData({...regData, dob: e.target.value})} />
                      </div>
                      <div className="input-group">
                         <label className="field-label">Gender</label>
                         <select className="select-field" value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})}>
                            <option>Male</option><option>Female</option><option>Other</option>
                         </select>
                      </div>
                   </div>

                   {/* Additional Details */}
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div><label className="field-label">Blood Group</label><select className="select-field" value={regData.blood_group} onChange={e => setRegData({...regData, blood_group: e.target.value})}><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></div>
                      <div><label className="field-label">Occupation</label><input className="input-field" value={regData.occupation} onChange={e => setRegData({...regData, occupation: e.target.value})} /></div>
                   </div>

                   <div className="input-group" style={{ marginBottom: '24px' }}>
                      <label className="field-label">Guardian / Emergency Contact Name</label>
                      <input className="input-field" value={regData.guardian_name} onChange={e => setRegData({...regData, guardian_name: e.target.value})} />
                   </div>

                   <div className="input-group">
                      <label className="field-label">Permanent Address</label>
                      <textarea className="input-field" style={{ height: '80px', resize: 'none' }} value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} />
                   </div>
                </div>
              )}

              {/* SELECTED PATIENT BANNER */}
              {selectedPatient && (
                <div style={{ background: '#0f172a', color: 'white', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: '18px' }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7, fontWeight: 600 }}>{selectedPatient.mrn} • {selectedPatient.phone} • {selectedPatient.gender}</div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>CHANGE</button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: CLINICAL & ASSIGNMENT (The "Professional" Checkout) */}
          <div className="page-card glass-card" style={{ padding: '32px', borderRadius: '32px', display: 'flex', flexDirection: 'column', border: '2px solid white', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 28px', fontSize: '13px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} /> 2. CAPTURE VITALS & ASSIGN DOCTOR
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
               <div className="input-group">
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Scale size={12} /> Weight (kg)</label>
                  <input className="input-field high-velocity-input" placeholder="e.g. 70" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} />
               </div>
               <div className="input-group">
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={12} /> BP (Syst/Dia)</label>
                  <input className="input-field high-velocity-input" placeholder="e.g. 120/80" value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} />
               </div>
               <div className="input-group">
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HeartPulse size={12} /> Temp (°F)</label>
                  <input className="input-field high-velocity-input" placeholder="e.g. 98.6" value={vitals.temp} onChange={e => setVitals({...vitals, temp: e.target.value})} />
               </div>
               <div className="input-group">
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> Height (cm)</label>
                  <input className="input-field high-velocity-input" placeholder="e.g. 175" value={vitals.height} onChange={e => setVitals({...vitals, height: e.target.value})} />
               </div>
            </div>

             <div style={{ marginBottom: '40px' }}>
                <label className="field-label" style={{ marginBottom: '16px' }}>SELECT CONSULTING DOCTOR</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {doctors.length === 0 && (
                    <div style={{ padding: '20px', borderRadius: '15px', border: '2px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                      <Users size={24} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>SEARCHING FOR CLINICIANS...</div>
                      <div style={{ fontSize: '11px' }}>If this persists, please check Hospital Masters.</div>
                    </div>
                  )}
                  {doctors.map(d => (
                    <button 
                     key={d.id || Math.random()} 
                     type="button"
                     onClick={() => setSelectedDoctorId(d.id)}
                     style={{ 
                       width: '100%',
                       padding: '20px', borderRadius: '20px', border: `2px solid ${selectedDoctorId === d.id ? '#3b82f6' : '#f1f5f9'}`, 
                       background: selectedDoctorId === d.id ? '#f0f9ff' : 'white', cursor: 'pointer', transition: '0.2s',
                       display: 'flex', alignItems: 'center', gap: '16px',
                       textAlign: 'left'
                     }}
                   >
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: selectedDoctorId === d.id ? '#3b82f6' : '#f8fafc', color: selectedDoctorId === d.id ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Users size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontWeight: 800, fontSize: '15px', color: selectedDoctorId === d.id ? '#1e40af' : '#1e293b' }}>{d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`}</div>
                         <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{d.specialization || d.department || 'General Physician'}</div>
                      </div>
                      {selectedDoctorId === d.id && <CheckCircle2 size={20} style={{ color: '#3b82f6' }} />}
                    </button>
                  ))}
                </div>
             </div>

            <div style={{ marginTop: 'auto' }}>
               <button 
                disabled={isProcessing || (!selectedPatient && !regData.name)}
                onClick={selectedPatient ? queueExistingPatient : registerAndQueue}
                style={{ 
                  width: '100%', padding: '26px', borderRadius: '24px', border: 'none', 
                  background: (selectedPatient || regData.name) && selectedDoctorId ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : '#cbd5e1',
                  color: 'white', fontWeight: 900, fontSize: '18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)'
                }}
               >
                 {isProcessing ? 'PROCESSING...' : <><Zap size={22} fill="currentColor" /> FINALIZE & ISSUE TOKEN</>}
               </button>
               <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}><Shield size={12} /> HIPAA COMPLIANT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}><CheckCircle2 size={12} /> REAL-TIME SYNC</div>
               </div>
            </div>
          </div>

          {/* RECENT QUEUE MINI-CARD */}
          <div className="page-card" style={{ gridColumn: '1 / 2', padding: '28px', borderRadius: '28px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#64748b' }}>RECENTLY PROCESSED</h3>
                <button onClick={fetchInitialData} className="button-link" style={{ fontSize: '11px', fontWeight: 800 }}>REFRESH</button>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {recentQueue.map((q, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#10b981' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>{q.patient_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Assigned to Dr. {q.doctor_name}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>TOKEN #{q.token || (i+1)}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
