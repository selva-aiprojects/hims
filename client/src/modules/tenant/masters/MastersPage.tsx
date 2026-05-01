import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function MastersPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [departments, setDepartments] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [specialities, setSpecialities] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("departments");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<any>({ 
    name: '', price: '', category: '', description: '',
    uom: '', instructions: '', details: '', icd_code: '',
    severity_level: 'Moderate', cpt_code: '', estimated_duration: '',
    hod: '', specialty: '', service_code: '', tax_percent: '',
    fee: '', surcharge: '', is_virtual: false,
    composition: '', dosage_adult: '', dosage_pediatric: ''
  });

  useEffect(() => {
    if (role !== 'admin') { navigate("/tenant/dashboard"); return; }
    fetchData();
  }, [role, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      const [depRes, disRes, treRes, serRes, medRes, specRes, modeRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/masters/departments`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/diseases`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/treatments`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/services`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/specialities`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/modes`, { headers })
      ]);
      setDepartments(depRes.data);
      setDiseases(disRes.data);
      setTreatments(treRes.data);
      setServices(serRes.data);
      setMedicines(medRes.data);
      setSpecialities(specRes.data);
      setModes(modeRes.data);
    } catch (err) {
      console.error("Failed to fetch masters", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      await axios.post(`${API_BASE}/api/hospital/masters/${activeTab === 'specialities' ? 'specialities' : activeTab === 'modes' ? 'modes' : activeTab}`, newItem, { headers });
      setShowAddModal(false);
      setNewItem({ 
        name: '', price: '', category: '', description: '',
        uom: '', instructions: '', details: '', icd_code: '',
        severity_level: 'Moderate', cpt_code: '', estimated_duration: '',
        hod: '', specialty: '', service_code: '', tax_percent: '',
        fee: '', surcharge: '', is_virtual: false,
        composition: '', dosage_adult: '', dosage_pediatric: ''
      });
      fetchData();
    } catch (err) {
      alert("Failed to add master data");
    }
  };

  const getActiveData = () => {
    switch(activeTab) {
      case 'departments': return departments;
      case 'diseases': return diseases;
      case 'treatments': return treatments;
      case 'services': return services;
      case 'medicines': return medicines;
      case 'specialities': return specialities;
      case 'modes': return modes;
      default: return [];
    }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Master Data Management" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            {['departments', 'specialities', 'modes', 'diseases', 'treatments', 'services', 'medicines'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: activeTab === tab ? '#3b82f6' : 'transparent',
                  color: activeTab === tab ? 'white' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              padding: '12px 24px', 
              borderRadius: '14px', 
              background: '#0f172a', 
              color: 'white', 
              border: 'none', 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer' 
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add {activeTab.slice(0, -1)}
          </button>
        </div>

        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
             <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', textTransform: 'capitalize' }}>Add New {activeTab.slice(0, -1)}</h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                   <input 
                     placeholder="Name / Title" 
                     style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                     value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                   />

                   {activeTab === 'medicines' ? (
                     <>
                        <input placeholder="Clinical Category (e.g. Antibiotic)" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                        <textarea placeholder="Generic Composition / Salts" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '60px' }} value={newItem.composition} onChange={e => setNewItem({...newItem, composition: e.target.value})} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input placeholder="Adult Dosage" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.dosage_adult} onChange={e => setNewItem({...newItem, dosage_adult: e.target.value})} />
                          <input placeholder="Pediatric Dosage" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.dosage_pediatric} onChange={e => setNewItem({...newItem, dosage_pediatric: e.target.value})} />
                        </div>
                        <input placeholder="Clinical Instructions" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.instructions} onChange={e => setNewItem({...newItem, instructions: e.target.value})} />
                     </>
                   ) : (
                     <>
                        {activeTab === 'specialities' && (
                          <input placeholder="Base Consultation Fee (₹)" type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.fee} onChange={e => setNewItem({...newItem, fee: e.target.value})} />
                        )}

                        {activeTab === 'modes' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                             <input placeholder="Surcharge %" type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.surcharge} onChange={e => setNewItem({...newItem, surcharge: e.target.value})} />
                             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                                <input type="checkbox" checked={newItem.is_virtual} onChange={e => setNewItem({...newItem, is_virtual: e.target.checked})} />
                                Is Virtual?
                             </label>
                          </div>
                        )}

                        {activeTab === 'departments' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                             <input placeholder="HOD Name" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.hod} onChange={e => setNewItem({...newItem, hod: e.target.value})} />
                             <input placeholder="Specialty" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.specialty} onChange={e => setNewItem({...newItem, specialty: e.target.value})} />
                          </div>
                        )}

                        {activeTab === 'diseases' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                             <input placeholder="ICD Code" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.icd_code} onChange={e => setNewItem({...newItem, icd_code: e.target.value})} />
                             <select style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.severity_level} onChange={e => setNewItem({...newItem, severity_level: e.target.value})}>
                                <option value="Mild">Mild</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Severe">Severe</option>
                             </select>
                          </div>
                        )}

                        {(activeTab === 'services' || activeTab === 'treatments') && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                             <input placeholder={activeTab === 'services' ? "Service Code" : "CPT Code"} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={activeTab === 'services' ? newItem.service_code : newItem.cpt_code} onChange={e => setNewItem({...newItem, [activeTab === 'services' ? 'service_code' : 'cpt_code']: e.target.value})} />
                             <input placeholder="Price (₹)" type="number" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                          </div>
                        )}

                        <textarea placeholder="Description / Category" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '60px' }} value={activeTab === 'departments' ? newItem.description : newItem.category} onChange={e => setNewItem({...newItem, [activeTab === 'departments' ? 'description' : 'category']: e.target.value})} />
                     </>
                   )}

                   <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}>Cancel</button>
                      <button onClick={handleAdd} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 700 }}>Save Master</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading masters...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>IDENTIFIER / NAME</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>CLINICAL DETAILS</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>STATUS / PRICING</th>
                </tr>
              </thead>
              <tbody>
                {getActiveData().length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No {activeTab} defined in this shard yet.</td></tr>
                ) : getActiveData().map((item: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.icd_code || item.cpt_code || item.service_code || 'ID: ' + item.id.slice(0, 8)}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {activeTab === 'medicines' ? (
                        <>
                          <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{item.composition}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Adult: {item.dosage_adult} | Ped: {item.dosage_pediatric}</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{item.category || item.specialty || item.description || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.instructions || item.hod || '-'}</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {item.price || item.base_consultation_fee || item.fee ? (
                        <div style={{ fontWeight: 800, color: '#0d9488' }}>₹{item.price || item.base_consultation_fee || item.fee}</div>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px' }}>ACTIVE</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
