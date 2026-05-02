import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://127.0.0.1:4000";

export default function OPDRegistrationPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', gender: 'Male', age: '' });
  const [historyFiles, setHistoryFiles] = useState<FileList | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [opdEntry, setOpdEntry] = useState({ patientId: '', doctorId: '', departmentId: '', weight: '', height: '', bp: '', temp: '' });
  
  useEffect(() => {
    const fetchMasters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const docRes = await axios.get(`${API_BASE}/api/hospital/staff`, { headers });
        setDoctors(docRes.data.filter((s: any) => s.role === 'doctor'));
      } catch (err) { console.error(err); }
    };
    fetchMasters();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/patients?search=${searchTerm}`, { headers });
      setPatients(res.data);
    } catch (err) { console.error(err); }
  };

  const registerPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const formData = new FormData();
      formData.append("name", newPatient.name);
      formData.append("phone", newPatient.phone);
      formData.append("age", newPatient.age);
      formData.append("gender", newPatient.gender || 'Male');
      
      if (historyFiles) {
        for (let i = 0; i < historyFiles.length; i++) {
          formData.append("history_files", historyFiles[i]);
        }
      }

      // We don't set Content-Type header manually when using FormData, axios sets it with the boundary
      const res = await axios.post(`${API_BASE}/api/patients`, formData, { headers });
      
      setOpdEntry({ ...opdEntry, patientId: res.data.id });
      setShowRegForm(false);
      setHistoryFiles(null);
      alert(`Patient Record Created Successfully! MRN: ${res.data.mrn}`);
    } catch (err: any) { 
      const status = err.response?.status;
      const data = JSON.stringify(err.response?.data || "No response data");
      console.error("Registration Failed:", err);
      alert(`Registration Error [${status}]: ${data}`); 
    } finally {
      setIsRegistering(false);
    }
  };

  const startVisit = async () => {
    if (!opdEntry.patientId || !opdEntry.doctorId) {
      alert("Please select both a patient and a doctor.");
      return;
    }
    
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };

    try {
      const payload = {
        patientId: opdEntry.patientId,
        doctorId: opdEntry.doctorId,
        type: 'OPD',
        vitals: {
          weight: opdEntry.weight,
          height: opdEntry.height,
          bp: opdEntry.bp,
          temp: opdEntry.temp
        },
        complaints: '' 
      };

      await axios.post(`${API_BASE}/api/hospital/encounters`, payload, { headers });
      alert(`Patient added to queue successfully.`);
      navigate('/tenant/opd/queue');
    } catch (err) {
      console.error(err);
      alert("Failed to create visit encounter.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="OPD Patient Intake" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* IDENTIFY PATIENT */}
          <section className="form-card">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</div>
                <h2 className="section-title">Identify Patient</h2>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input 
                placeholder="Name or Phone..." 
                className="input-field"
                style={{ flex: 1 }}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
              <button onClick={handleSearch} className="button-primary">Search</button>
            </div>

            <div style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              {patients.map(p => (
                <div key={p.id} onClick={() => setOpdEntry({ ...opdEntry, patientId: p.id })} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${opdEntry.patientId === p.id ? '#3b82f6' : '#e2e8f0'}`, marginBottom: '10px', cursor: 'pointer', background: opdEntry.patientId === p.id ? '#f0f9ff' : 'white' }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{p.phone} • {p.age} Yrs</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowRegForm(!showRegForm)} className="button-secondary" style={{ width: '100%', border: '2px dashed #3b82f6', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6' }}>+ Register New Patient</button>

            {showRegForm && (
              <form onSubmit={registerPatient} className="form-card" style={{ marginTop: '24px', background: '#f8fafc' }}>
                <input placeholder="Full Name" required className="input-field" style={{ marginBottom: '12px' }} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                <input placeholder="Phone Number" required className="input-field" style={{ marginBottom: '12px' }} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <input placeholder="Age" type="number" required className="input-field" style={{ flex: 1 }} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
                    <select className="select-field" style={{ flex: 1 }} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}><option>Male</option><option>Female</option></select>
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Upload History Records (Optional for AI Summary)</label>
                  <input type="file" multiple accept=".pdf,image/*" onChange={(e) => setHistoryFiles(e.target.files)} style={{ fontSize: '12px' }} />
                </div>
                <button type="submit" disabled={isRegistering} className="button-primary" style={{ width: '100%', marginTop: '12px', opacity: isRegistering ? 0.7 : 1 }}>
                  {isRegistering ? 'Generating AI Summary & Saving...' : 'Save Record & Generate AI Summary'}
                </button>
              </form>
            )}
          </section>

          {/* VITALS & VISIT */}
          <section className="form-card">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</div>
                <h2 className="section-title">Capture Vitals & Assign</h2>
              </div>
            </div>
            
            <div className="form-grid grid-2" style={{ marginBottom: '24px' }}>
               <div><label className="field-label">Weight (kg)</label><input className="input-field" onChange={e => setOpdEntry({...opdEntry, weight: e.target.value})} /></div>
               <div><label className="field-label">BP (120/80)</label><input className="input-field" onChange={e => setOpdEntry({...opdEntry, bp: e.target.value})} /></div>
               <div><label className="field-label">Temp (°F)</label><input className="input-field" onChange={e => setOpdEntry({...opdEntry, temp: e.target.value})} /></div>
               <div><label className="field-label">Height (cm)</label><input className="input-field" onChange={e => setOpdEntry({...opdEntry, height: e.target.value})} /></div>
            </div>

            <div style={{ marginBottom: '20px' }}>
               <label className="field-label">Assign Doctor</label>
               <select className="select-field" onChange={e => setOpdEntry({...opdEntry, doctorId: e.target.value})}>
                  <option value="">Select Doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.role})</option>)}
               </select>
            </div>

            <div style={{ padding: '24px', background: '#0f172a', borderRadius: '24px', color: 'white', marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Service Fee</span><span style={{ fontWeight: 800 }}>--</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}><span style={{ fontWeight: 700 }}>Payable Now</span><span style={{ fontSize: '24px', fontWeight: 900, color: '#3b82f6' }}>₹0.00</span></div>
            </div>

            <button disabled={!opdEntry.patientId || !opdEntry.doctorId} onClick={startVisit} style={{ width: '100%', padding: '20px', borderRadius: '20px', border: 'none', background: opdEntry.patientId && opdEntry.doctorId ? '#3b82f6' : '#f1f5f9', color: opdEntry.patientId && opdEntry.doctorId ? 'white' : '#94a3b8', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}>Generate Token & Start Visit</button>
          </section>
        </div>
      </main>
    </div>
  );
}
