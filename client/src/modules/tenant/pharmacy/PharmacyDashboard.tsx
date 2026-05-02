import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function PharmacyDashboard() {
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, pendingPrescriptions: 0, todaysSales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const [invRes, preRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/pharmacy/inventory`, { headers }),
        axios.get(`${API_BASE}/api/hospital/pharmacy/prescriptions`, { headers })
      ]);
      setStats({
        totalItems: invRes.data.length,
        lowStock: invRes.data.filter((i: any) => i.stock_quantity < 50).length,
        pendingPrescriptions: preRes.data.length,
        todaysSales: 0 // Placeholder
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Pharmacy Intelligence Dashboard" />
        
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Pharmacy Overview</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Real-time inventory metrics and dispensing throughput</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {[
            { label: 'Total Stock items', value: stats.totalItems, color: '#3b82f6', icon: '📦' },
            { label: 'Low stock alerts', value: stats.lowStock, color: '#ef4444', icon: '⚠️' },
            { label: 'Pending Orders', value: stats.pendingPrescriptions, color: '#f59e0b', icon: '📋' },
            { label: 'Revenue (Today)', value: `₹${stats.todaysSales}`, color: '#10b981', icon: '💰' }
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
               <div style={{ fontSize: '24px', marginBottom: '12px' }}>{s.icon}</div>
               <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
               <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 900, color: s.color }}>{loading ? '...' : s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
           <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Inventory Health</h3>
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '20px' }}>
                 Stock Movement Chart Placeholder
              </div>
           </div>
           <div style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Recent Dispenses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {[1,2,3].map(i => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                         <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Walk-in Patient</p>
                         <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Paracetamol 500mg x 10</p>
                      </div>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>₹120.00</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
