import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

const Icons = {
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Activity: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Pill: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
  Flask: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l-2 6H8l-2-6zM8 9v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9"/></svg>,
  History: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
};

export default function OPDConsultationPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [encounter, setEncounter] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) { navigate("/"); return; }

    const data = localStorage.getItem("currentEncounter");
    if (data) setEncounter(JSON.parse(data));

    const fetchData = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const [medRes, disRes] = await Promise.all([
          axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/diseases`, { headers })
        ]);
        setMedicines(medRes.data);
        setDiseases(disRes.data);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [role, navigate]);

  const addPrescription = (medId: string) => {
    const med = medicines.find(m => m.id === medId);
    if (med) {
      setPrescriptions([...prescriptions, {
        id: med.id,
        name: med.name, // Clinical Generic Name
        composition: med.composition,
        dosage: encounter.age < 12 ? med.dosage_pediatric : med.dosage_adult,
        instructions: med.instructions || 'As directed'
      }]);
    }
  };

  const finishConsultation = async () => {
    setLoading(true);
    setTimeout(() => {
      alert("Consultation finalized. Patient moved to billing.");
      navigate("/billing", { 
        state: { 
          billType: 'OPD', 
          totalAmount: encounter.reg_fee || 500,
          patientName: encounter.patient_name,
          encounterId: encounter.id
        } 
      });
      setLoading(false);
    }, 1000);
  };

  if (!encounter) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading patient encounter...</div>;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Clinical Consultation Desk" />

        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icons.User />
             </div>
             <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>{encounter.patient_name}</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>{encounter.age} yrs • {encounter.gender} • Token <span style={{ fontWeight: 800, color: '#0d9488' }}>#{encounter.token}</span></p>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>BP</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.bp || '120/80'}</p></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Weight</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.weight || '70kg'}</p></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Temp</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.temp || '98.6°F'}</p></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Diagnosis Section */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Activity /> Diagnosis & Observations
                 </h3>
                 <select 
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', fontWeight: 600 }}
                    value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                 >
                    <option value="">Select ICD-10 Diagnosis...</option>
                    {diseases.map(d => <option key={d.id} value={d.name}>{d.name} ({d.icd_code})</option>)}
                 </select>
                 <textarea 
                    placeholder="Enter clinical notes..." 
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100px', resize: 'none' }}
                 />
              </div>

              {/* Prescription Section */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Pill /> Medical Prescription
                 </h3>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '20px' }}>
                    <select 
                       style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 600 }}
                       onChange={(e) => addPrescription(e.target.value)}
                    >
                       <option value="">Search Clinical Generic Master...</option>
                       {medicines.map(m => <option key={m.id} value={m.id}>{m.name} - {m.composition}</option>)}
                    </select>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {prescriptions.map((p, i) => (
                      <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                            <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>{p.name}</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>{p.composition}</p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                               <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488', background: '#f0fdfa', padding: '2px 8px', borderRadius: '6px' }}>{p.dosage}</span>
                               <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{p.instructions}</span>
                            </div>
                         </div>
                         <button onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                         </button>
                      </div>
                    ))}
                    {prescriptions.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No medicines prescribed yet.</p>}
                 </div>
              </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Order Lab Tests */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Flask /> Lab Investigations
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['Complete Blood Count (CBC)', 'Lipid Profile', 'Chest X-Ray', 'ECG'].map(test => (
                      <label key={test} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                         <input type="checkbox" /> {test}
                      </label>
                    ))}
                 </div>
              </div>

              {/* Action */}
              <button 
                 onClick={finishConsultation}
                 disabled={loading}
                 style={{ 
                    padding: '20px', 
                    borderRadius: '20px', 
                    background: '#0f172a', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: 900, 
                    fontSize: '16px', 
                    cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)'
                 }}
              >
                 {loading ? "FINALIZING..." : "FINISH CONSULTATION"}
              </button>
           </div>
        </div>
      </main>
    </div>
  );
}
