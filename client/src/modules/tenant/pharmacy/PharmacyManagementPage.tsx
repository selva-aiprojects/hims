import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function PharmacyManagementPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDispense, setShowDispense] = useState(false);
  const [dispenseData, setDispenseData] = useState({ encounterId: '', drugId: '', quantity: 1 });

  useEffect(() => {
    // Security Guard
    if (!role) {
      navigate("/");
      return;
    }
    fetchInventory(); 
  }, [role, navigate]);

  const fetchInventory = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/pharmacy/inventory`, { headers });
      setInventory(res.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    const drug = inventory.find(i => i.id === dispenseData.drugId);
    if (!drug) return;

    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.post(`${API_BASE}/api/hospital/pharmacy/dispense`, {
        ...dispenseData,
        total_price: drug.unit_price * dispenseData.quantity
      }, { headers });
      
      setShowDispense(false);
      fetchInventory();
      
      if (window.confirm("Medicine dispensed! Would you like to process billing now?")) {
        navigate('/billing', { 
          state: { 
            billType: 'PHARMACY', 
            totalAmount: drug.unit_price * dispenseData.quantity,
            patientName: "Pharmacy Walk-in" 
          } 
        });
      }
    } catch (err) { 
      alert("Dispensing failed. Check stock levels or Encounter ID."); 
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Pharmacy Inventory Hub" />

        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div className="welcome-msg">
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Pharmacy Inventory Hub</h1>
            <p>Manage drug stock and dispense medications.</p>
          </div>
          <button 
            onClick={() => setShowDispense(true)}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Dispense Medication
          </button>
        </header>

        <div className="stats-grid" style={{ marginBottom: '32px' }}>
          {[
            { label: 'Total Medicines', value: inventory.length.toString(), color: '#3b82f6' },
            { label: 'Low Stock Items', value: inventory.filter(i => i.stock_quantity < 50).length.toString(), color: '#ef4444' },
            { label: 'Expiring Soon', value: '2', color: '#f59e0b' }
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
               <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>{s.label}</div>
               <div style={{ fontSize: '24px', fontWeight: 900, color: s.color }}>{loading ? '...' : s.value}</div>
            </div>
          ))}
        </div>

        <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>DRUG NAME</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>CATEGORY</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>STOCK</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>UNIT PRICE</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>EXPIRY</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 700 }}>{item.drug_name}</td>
                  <td style={{ padding: '16px 24px', color: '#64748b' }}>{item.category}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      fontWeight: 800, 
                      color: item.stock_quantity < 50 ? '#ef4444' : '#10b981'
                    }}>
                      {item.stock_quantity} units
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>₹{item.unit_price.toFixed(2)}</td>
                  <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px' }}>
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Inventory is empty.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {showDispense && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 800 }}>Dispense Medication</h2>
              <form onSubmit={handleDispense}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Select Medicine</label>
                  <select 
                    required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    onChange={e => setDispenseData({...dispenseData, drugId: e.target.value})}
                  >
                    <option value="">Select Drug</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.drug_name} (₹{i.unit_price}/unit)</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Quantity</label>
                  <input 
                    type="number" min="1" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    value={dispenseData.quantity} onChange={e => setDispenseData({...dispenseData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Visit ID (Encounter)</label>
                  <input 
                    placeholder="Enter Encounter ID" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    value={dispenseData.encounterId} onChange={e => setDispenseData({...dispenseData, encounterId: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowDispense(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Confirm & Dispense</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
