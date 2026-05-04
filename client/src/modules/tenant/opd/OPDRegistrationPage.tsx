import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import PrivacyValue from "../../../components/PrivacyValue";
import { API_BASE_URL as API_BASE } from "../../../config/api";

export default function OPDRegistrationPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', gender: 'Male', age: '' });
  const [historyFiles, setHistoryFiles] = useState<FileList | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [opdEntry, setOpdEntry] = useState({ patientId: '', doctorId: '', departmentId: '', weight: '', height: '', bp: '', temp: '' });
  
  const fetchRecentPatients = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      // Fetch latest 10 patients
      const res = await axios.get(`${API_BASE}/api/patients?limit=10`, { headers });
      setRecentPatients(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const fetchMasters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const [docRes, srvRes] = await Promise.all([
          axios.get(`${API_BASE}/api/hospital/staff`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/services`, { headers })
        ]);
        setDoctors(docRes.data.filter((s: any) => s.role === 'doctor'));
        setServices(srvRes.data);
        fetchRecentPatients();
      } catch (err) { console.error(err); }
    };
    fetchMasters();
  }, []);

  const consultationService = services.find(s => s.category === 'Consultation' || s.name.toLowerCase().includes('consultation')) || { price: 0 };
  
  const handleSearch = async () => {
    if (!searchTerm) {
      setPatients([]);
      return;
    }
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

      const res = await axios.post(`${API_BASE}/api/patients`, formData, { headers });
      
      setOpdEntry({ ...opdEntry, patientId: res.data.id });
      setShowRegForm(false);
      setHistoryFiles(null);
      alert(`Patient Record Created Successfully! MRN: ${res.data.mrn}`);
      fetchRecentPatients();
    } catch (err: any) { 
      console.error("Registration Failed:", err);
      alert(`Registration Error: ${err.message}`); 
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
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
                placeholder="Search by MRN, Name or Phone..." 
                className="input-field"
                style={{ flex: 1 }}
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} className="button-primary">Search</button>
            </div>

            <div style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              {patients.map(p => (
                <div key={p.id} onClick={() => setOpdEntry({ ...opdEntry, patientId: p.id })} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${opdEntry.patientId === p.id ? '#3b82f6' : '#e2e8f0'}`, marginBottom: '10px', cursor: 'pointer', background: opdEntry.patientId === p.id ? '#f0f9ff' : 'white' }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>{p.mrn}</span> • <PrivacyValue value={p.phone} type="phone" /> • {p.age} Yrs
                  </div>
                </div>
              ))}
              {searchTerm && patients.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>No matches found.</p>
              )}
            </div>

            <button onClick={() => setShowRegForm(!showRegForm)} className="button-secondary" style={{ width: '100%', border: '2px dashed #3b82f6', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6' }}>
              {showRegForm ? '✕ Cancel Registration' : '+ Register New Patient'}
            </button>

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
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Service Fee</span><span style={{ fontWeight: 800 }}>₹{consultationService.price || '0.00'}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}><span style={{ fontWeight: 700 }}>Payable Now</span><span style={{ fontSize: '24px', fontWeight: 900, color: '#3b82f6' }}>₹{consultationService.price || '0.00'}</span></div>
            </div>

            <button disabled={!opdEntry.patientId || !opdEntry.doctorId} onClick={startVisit} style={{ width: '100%', padding: '20px', borderRadius: '20px', border: 'none', background: opdEntry.patientId && opdEntry.doctorId ? '#3b82f6' : '#f1f5f9', color: opdEntry.patientId && opdEntry.doctorId ? 'white' : '#94a3b8', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}>Generate Token & Start Visit</button>
          </section>
        </div>

        {/* RECENT PATIENTS LIST */}
        <div className="manage-card" style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Recent Registrations</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Latest patients added to the system</p>
            </div>
            <button onClick={fetchRecentPatients} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Refresh List</button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>MRN / PATIENT</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>CONTACT</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>AGE/GENDER</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>DATE</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{p.mrn}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#475569' }}>
                    <PrivacyValue value={p.phone} type="phone" />
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#475569' }}>
                    {p.age} Y • {p.gender}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#94a3b8' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={() => {
                        setOpdEntry({ ...opdEntry, patientId: p.id });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ padding: '8px 16px', borderRadius: '10px', background: opdEntry.patientId === p.id ? '#10b981' : '#f1f5f9', color: opdEntry.patientId === p.id ? 'white' : '#475569', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      {opdEntry.patientId === p.id ? 'Selected' : 'Select for Visit'}
                    </button>
                  </td>
                </tr>
              ))}
              {recentPatients.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No recent registrations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
