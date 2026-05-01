import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function LabManagementPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [resultText, setResultText] = useState("");

  const fetchOrders = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/lab/orders`, { headers });
      setOrders(res.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchOrders(); 
  }, []);

  const saveResult = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.put(`${API_BASE}/api/hospital/lab/orders/${activeOrder.id}`, { result_data: resultText }, { headers });
      alert("Results recorded successfully!");
      setActiveOrder(null);
      setResultText("");
      fetchOrders();
      if (confirm("Would you like to process billing for this test now?")) {
        navigate('/billing', { state: { billType: 'LAB', totalAmount: 85.00 } });
      }
    } catch (err) { 
      alert("Failed to save result"); 
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Laboratory Diagnostics Desk" />

        <div style={{ display: 'grid', gridTemplateColumns: activeOrder ? '1fr 400px' : '1fr', gap: '32px' }}>
          <div>
            <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Pending Test Queue</h2>
                <span style={{ fontSize: '12px', background: '#eff6ff', color: '#3b82f6', padding: '6px 12px', borderRadius: '20px', fontWeight: 700 }}>
                  {orders.length} Active Orders
                </span>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>PATIENT</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>TEST NAME</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 700 }}>{o.patient_name}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#3b82f6' }}>{o.test_name}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <button 
                          onClick={() => setActiveOrder(o)}
                          style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Process
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !loading && (
                    <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No pending lab orders.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {activeOrder && (
            <aside style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Enter Findings</h3>
                <button onClick={() => setActiveOrder(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>CURRENT TEST</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{activeOrder.test_name}</div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Test Results / Parameters</label>
                <textarea 
                  placeholder="Enter detailed test parameters and results..."
                  style={{ width: '100%', height: '250px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                  value={resultText} onChange={e => setResultText(e.target.value)}
                />
              </div>

              <button 
                onClick={saveResult}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Authorize & Submit Report
              </button>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
