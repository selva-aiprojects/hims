import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import PrivacyValue from "../../../components/PrivacyValue";
import { API_BASE_URL as API_BASE } from "../../../config/api";


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
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
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
    fetchData();
  }, [role, navigate]);

  const toggleLabTest = (id: string) => {
    if (selectedLabTests.includes(id)) {
      setSelectedLabTests(selectedLabTests.filter(t => t !== id));
    } else {
      setSelectedLabTests([...selectedLabTests, id]);
    }
  };

  const addPrescription = (medicineId: string) => {
    if (!medicineId) return;
    const medicine = medicines.find(m => m.id === medicineId);
    if (medicine) {
      setPrescriptions([...prescriptions, {
        medicine_id: medicine.id,
        name: medicine.name,
        composition: medicine.composition,
        dosage: '1 Tab',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: 'Take after meals'
      }]);
    }
  };

  const finishConsultation = async () => {
    if (!diagnosis) {
      alert("Please select a diagnosis before finishing.");
      return;
    }
    setLoading(true);
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };

    try {
      // 1. Update Encounter with Diagnosis & Notes
      await axios.put(`${API_BASE}/api/hospital/encounters/${encounter.id}`, {
        diagnosis: diagnosis,
        status: 'Completed',
        notes: notes
      }, { headers });

      // 2. Save Prescriptions if any
      if (prescriptions.length > 0) {
        await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/prescriptions`, {
          items: prescriptions
        }, { headers });
      }

      // 3. Save Lab Orders if any
      if (selectedLabTests.length > 0) {
        await axios.post(`${API_BASE}/api/hospital/encounters/${encounter.id}/lab-orders`, {
          diagnosticIds: selectedLabTests
        }, { headers });
      }

      // 4. Move to Billing
      const consultationFee = medicines.find(m => m.category === 'Consultation' || m.name.toLowerCase().includes('consultation'))?.price || 0;
      
      localStorage.removeItem("currentEncounter");
      navigate("/billing", { 
        state: { 
          billType: 'OPD', 
          totalAmount: consultationFee,
          patientName: encounter.patient_name,
          encounterId: encounter.id 
        } 
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save consultation data.");
    } finally {
      setLoading(false);
    }
  };

  if (!encounter) return (
    <div style={{ padding: '80px', textAlign: 'center', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'inline-block', maxWidth: '400px' }}>
        <h2 style={{ fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>No Patient Selected</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Please select a patient from the doctor's queue to start a consultation.</p>
        <button 
          onClick={() => navigate("/tenant/opd/queue")}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
        >
          Go to Patient Queue
        </button>
      </div>
    </div>
  );

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                   <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 800 }}>{encounter.mrn}</span>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <span style={{ fontSize: '13px', color: '#64748b' }}>{encounter.age} yrs • {encounter.gender}</span>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <div style={{ fontSize: '13px' }}>
                      <PrivacyValue value={encounter.phone} type="phone" ownerId={encounter.doctor_id} />
                   </div>
                   <span style={{ color: '#e2e8f0' }}>|</span>
                   <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#0d9488', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>TOKEN #{encounter.token}</span>
                </div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>BP</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.vitals?.bp || 'N/A'}</p></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Weight</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.vitals?.weight || 'N/A'}kg</p></div>
             <div style={{ textAlign: 'center' }}><p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Temp</p><p style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>{encounter.vitals?.temp || 'N/A'}°F</p></div>
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
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
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
                      <div key={i} style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                               <p style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '15px' }}>{p.name}</p>
                               <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>{p.composition}</p>
                            </div>
                            <button onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                         </div>
                         
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                               <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Dosage</label>
                               <input 
                                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                                  value={p.dosage} 
                                  onChange={e => {
                                     const newP = [...prescriptions];
                                     newP[i].dosage = e.target.value;
                                     setPrescriptions(newP);
                                  }}
                               />
                            </div>
                            <div>
                               <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Frequency</label>
                               <input 
                                  placeholder="1-0-1"
                                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                                  value={p.frequency || '1-0-1'} 
                                  onChange={e => {
                                     const newP = [...prescriptions];
                                     newP[i].frequency = e.target.value;
                                     setPrescriptions(newP);
                                  }}
                               />
                            </div>
                            <div>
                               <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Duration</label>
                               <input 
                                  placeholder="5 days"
                                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                                  value={p.duration || '5 days'} 
                                  onChange={e => {
                                     const newP = [...prescriptions];
                                     newP[i].duration = e.target.value;
                                     setPrescriptions(newP);
                                  }}
                               />
                            </div>
                         </div>
                         <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            {p.instructions}
                         </div>
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
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {diagnostics.length > 0 ? diagnostics.map(test => (
                      <label key={test.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        border: selectedLabTests.includes(test.id) ? '1px solid #3b82f6' : '1px solid #f1f5f9', 
                        background: selectedLabTests.includes(test.id) ? '#eff6ff' : 'white',
                        cursor: 'pointer', 
                        fontSize: '13px', 
                        fontWeight: 600 
                      }}>
                         <input 
                           type="checkbox" 
                           checked={selectedLabTests.includes(test.id)}
                           onChange={() => toggleLabTest(test.id)}
                         /> 
                         <div style={{ flex: 1 }}>
                            <div>{test.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{test.type_name || 'Standard Test'}</div>
                         </div>
                         <div style={{ color: '#10b981' }}>₹{test.price}</div>
                      </label>
                    )) : (
                      <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No diagnostics masters found.</p>
                    )}
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
