import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function PharmacyManagementPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [inventory, setInventory] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("inventory"); // inventory | prescriptions
  const [activePrescription, setActivePrescription] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  useEffect(() => {
    if (!role) { navigate("/"); return; }
    fetchData(); 
  }, [role, navigate]);

  const fetchData = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const [invRes, preRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/pharmacy/inventory`, { headers }),
        axios.get(`${API_BASE}/api/hospital/pharmacy/prescriptions`, { headers })
      ]);
      setInventory(invRes.data);
      setPrescriptions(preRes.data);
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
        requestedQuantity: item.duration.split(' ')[0] * 3, // rough estimate for 3x day
        quantity: 10, // default dispense
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
    <div className="dashboard-layout" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px' }}>
        <Header title="Pharmacy & PIMS Hub" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Pharmacy Operations</h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>Inventory management & prescription fulfillment</p>
          </div>
          <div style={{ background: 'white', padding: '6px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '4px' }}>
             <button 
               onClick={() => setActiveTab("inventory")}
               style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'inventory' ? '#3b82f6' : 'transparent', color: activeTab === 'inventory' ? 'white' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
             >
                Stock Inventory
             </button>
             <button 
               onClick={() => setActiveTab("prescriptions")}
               style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'prescriptions' ? '#3b82f6' : 'transparent', color: activeTab === 'prescriptions' ? 'white' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
             >
                Prescription Queue
             </button>
          </div>
        </div>

        {activeTab === 'inventory' ? (
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Medicine</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>In Stock</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Price / Unit</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.drug_name}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>{item.category}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontWeight: 800, color: Number(item.stock_quantity) < 50 ? '#ef4444' : '#10b981' }}>{item.stock_quantity} units</span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 700 }}>₹{Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px' }}>{new Date(item.expiry_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Patient / MRN</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.patient_name}</div>
                      <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{p.mrn}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>Today</td>
                    <td style={{ padding: '16px 24px' }}>
                       <button 
                         onClick={() => startDispensing(p)}
                         style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                       >
                          Open & Dispense
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activePrescription && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
             <div style={{ width: '500px', background: 'white', borderRadius: '32px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                   <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Fulfill Prescription</h2>
                   <button onClick={() => setActivePrescription(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>
                
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
                   <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 700 }}>PATIENT</p>
                   <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{activePrescription.patient_name} <span style={{ color: '#3b82f6' }}>({activePrescription.mrn})</span></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                   {selectedItems.map((item, idx) => (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                           <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{item.drugName}</p>
                           <p style={{ margin: 0, fontSize: '11px', color: '#10b981' }}>Available: {inventory.find(i => i.id === item.drugId)?.stock_quantity || 0} units</p>
                        </div>
                        <input 
                           type="number" 
                           style={{ width: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 700, textAlign: 'center' }}
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
                  style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}
                >
                   Finalize & Record Dispense
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
