import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function PrescriptionQueue() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activePrescription, setActivePrescription] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const [preRes, invRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/pharmacy/prescriptions`, { headers }),
        axios.get(`${API_BASE}/api/hospital/pharmacy/inventory`, { headers })
      ]);
      setPrescriptions(preRes.data);
      setInventory(invRes.data);
    } catch (err) { console.error(err); }
  };

  const startDispensing = async (pres: any) => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/pharmacy/prescriptions/${pres.id}/items`, { headers });
      setActivePrescription({ ...pres, items: res.data });
      setSelectedItems(res.data.map((item: any) => ({
        drugId: inventory.find(i => i.drug_name === item.drug_name)?.id,
        drugName: item.drug_name,
        quantity: 10,
        unitPrice: inventory.find(i => i.drug_name === item.drug_name)?.unit_price || 0
      })));
    } catch (err) { alert("Failed to fetch prescription details"); }
  };

  const confirmDispense = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.post(`${API_BASE}/api/hospital/pharmacy/dispense`, {
        encounterId: activePrescription.encounter_id,
        items: selectedItems.filter(i => i.drugId)
      }, { headers });
      
      alert("Medication dispensed successfully!");
      setActivePrescription(null);
      fetchData();
      
      if (confirm("Would you like to generate the pharmacy bill now?")) {
        const total = selectedItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        navigate('/billing', { 
          state: { 
            billType: 'PHARMACY', 
            totalAmount: total,
            patientName: activePrescription.patient_name,
            encounterId: activePrescription.encounter_id
          } 
        });
      }
    } catch (err) { alert("Dispensing failed. Check stock levels."); }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Clinical Prescription Queue" />

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Pending Prescriptions</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Medication orders from OPD consultations</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activePrescription ? '1fr 450px' : '1fr', gap: '32px', alignItems: 'start' }}>
           <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                   <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Patient / MRN</th>
                   <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Prescribed By</th>
                   <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Status</th>
                   <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {prescriptions.map((p, i) => (
                   <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                     <td style={{ padding: '20px 24px' }}>
                       <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.patient_name}</div>
                       <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{p.mrn}</div>
                     </td>
                     <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>Dr. Admin</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>General Medicine</div>
                     </td>
                     <td style={{ padding: '20px 24px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#f59e0b', background: '#fffbeb', padding: '4px 12px', borderRadius: '20px' }}>PENDING</span>
                     </td>
                     <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <button 
                          onClick={() => startDispensing(p)}
                          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                           Dispense
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {activePrescription && (
             <aside style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                   <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Fulfill Order</h2>
                   <button onClick={() => setActivePrescription(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>
                
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', marginBottom: '24px' }}>
                   <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 700 }}>ORDER FOR</p>
                   <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{activePrescription.patient_name}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                   {selectedItems.map((item, idx) => (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px' }}>
                        <div>
                           <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{item.drugName}</p>
                           <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Stock: {inventory.find(i => i.id === item.drugId)?.stock_quantity || 0} units</p>
                        </div>
                        <input 
                           type="number" 
                           style={{ width: '64px', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 800, textAlign: 'center' }}
                           value={item.quantity}
                           onChange={e => {
                              const newItems = [...selectedItems];
                              newItems[idx].quantity = parseInt(e.target.value);
                              setSelectedItems(newItems);
                           }}
                        />
                     </div>
                   ))}
                </div>

                <button 
                  onClick={confirmDispense}
                  style={{ width: '100%', padding: '20px', borderRadius: '20px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}
                >
                   Validate & Dispense
                </button>
             </aside>
           )}
        </div>
      </main>
    </div>
  );
}
