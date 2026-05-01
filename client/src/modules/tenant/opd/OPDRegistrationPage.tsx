import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

const Icons = {
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Zap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Activity: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
};

export default function OPDRegistrationPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', gender: 'Male', age: '' });
  const [opdEntry, setOpdEntry] = useState({ patientId: '', doctorId: '', departmentId: '', weight: '', height: '', bp: '', temp: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const [docRes, depRes] = await Promise.all([
          axios.get(`${API_BASE}/api/hospital/staff`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/departments`, { headers })
        ]);
        setDoctors(docRes.data.filter((s: any) => s.role === 'doctor'));
        setDepartments(depRes.data);
      } catch (err) { console.error(err); }
    };
    fetchMasters();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/patients?search=${searchTerm}`, { headers });
      setPatients(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const registerPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.post(`${API_BASE}/api/patients`, newPatient, { headers });
      setOpdEntry({ ...opdEntry, patientId: res.data.id });
      setShowRegForm(false);
      alert("Patient Record Created!");
    } catch (err) { alert("Failed to register patient"); }
  };

  const startVisit = async () => {
    if (!opdEntry.patientId || !opdEntry.doctorId) return;
    
    // Simulate encounter creation
    const selectedPatient = patients.find(p => p.id === opdEntry.patientId) || { name: "New Patient", age: newPatient.age, gender: newPatient.gender };
    const selectedDoctor = doctors.find(d => d.id === opdEntry.doctorId);

    const encounterData = {
      ...opdEntry,
      patient_name: selectedPatient.name,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      doctor_name: selectedDoctor?.name || "Doctor",
      token: Math.floor(Math.random() * 100) + 1,
      status: 'Draft'
    };

    localStorage.setItem("currentEncounter", JSON.stringify(encounterData));
    alert(`Patient added to queue successfully.`);
    navigate('/tenant/opd/queue');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="OPD Patient Intake" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* IDENTIFY PATIENT */}
          <section style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Identify Patient</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input 
                placeholder="Name or Phone..." 
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
              <button onClick={handleSearch} style={{ padding: '0 24px', background: '#0f172a', color: 'white', borderRadius: '14px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Search</button>
            </div>

            <div style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              {patients.map(p => (
                <div key={p.id} onClick={() => setOpdEntry({ ...opdEntry, patientId: p.id })} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${opdEntry.patientId === p.id ? '#3b82f6' : '#e2e8f0'}`, marginBottom: '10px', cursor: 'pointer', background: opdEntry.patientId === p.id ? '#f0f9ff' : 'white' }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{p.phone} • {p.age} Yrs</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowRegForm(!showRegForm)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px dashed #3b82f6', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', fontWeight: 800, cursor: 'pointer' }}>+ Register New Patient</button>

            {showRegForm && (
              <form onSubmit={registerPatient} style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <input placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input placeholder="Age" type="number" required style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
                    <select style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}><option>Male</option><option>Female</option></select>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, marginTop: '12px' }}>Save Record</button>
              </form>
            )}
          </section>

          {/* VITALS & VISIT */}
          <section style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Capture Vitals & Assign</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
               <div><label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Weight (kg)</label><input style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setOpdEntry({...opdEntry, weight: e.target.value})} /></div>
               <div><label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>BP (120/80)</label><input style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setOpdEntry({...opdEntry, bp: e.target.value})} /></div>
               <div><label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Temp (°F)</label><input style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setOpdEntry({...opdEntry, temp: e.target.value})} /></div>
               <div><label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Height (cm)</label><input style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} onChange={e => setOpdEntry({...opdEntry, height: e.target.value})} /></div>
            </div>

            <div style={{ marginBottom: '20px' }}>
               <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Assign Doctor</label>
               <select style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc' }} onChange={e => setOpdEntry({...opdEntry, doctorId: e.target.value})}>
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
