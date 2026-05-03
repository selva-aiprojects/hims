import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


// SVG Icons
const Icons = {
  Patients: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Appointments: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
    </svg>
  ),
  Billing: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName] = useState(localStorage.getItem("userName") || "User");
  const [stats, setStats] = useState<any>({
    metrics: { patientInflow: 0, activeAdmissions: 0, pendingBills: 0, dailyRevenue: 0 },
    weeklyFlow: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      console.log("[DASHBOARD] Fetching live metrics...");
      try {
        const token = localStorage.getItem("token");
        const tenant = localStorage.getItem("tenant");
        
        if (!token || !tenant) {
          setError("Auth session missing. Please re-login.");
          return;
        }

        const res = await axios.get(`${API_BASE}/api/hospital/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-id": tenant
          }
        });
        
        console.log("[DASHBOARD] Stats received:", res.data);
        if (res.data && res.data.metrics) {
          setStats(res.data);
          setError(null);
        } else {
          console.warn("[DASHBOARD] Stats response was empty or malformed");
        }
      } catch (err: any) {
        console.error("[DASHBOARD] Fetch failed:", err);
        setError(`Failed to sync metrics: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const metrics = [
    { label: 'Patient Inflow', value: stats.metrics.patientInflow, trend: '+12%', color: '#3b82f6', icon: <Icons.Patients /> },
    { label: 'Active Admissions', value: stats.metrics.activeAdmissions, trend: 'Live', color: '#10b981', icon: <Icons.Appointments /> },
    { label: 'Pending Bills', value: stats.metrics.pendingBills, trend: 'Urgent', color: '#f59e0b', icon: <Icons.Billing /> },
    { label: 'Daily Revenue', value: `₹ ${Number(stats.metrics.dailyRevenue).toLocaleString() || '0.00'}`, trend: '+5%', color: '#8b5cf6', icon: <Icons.Billing /> }
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title={`Welcome, ${userName}`} />

        {error && (
          <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', color: '#b91c1c', marginBottom: '24px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', background: '#b91c1c', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer' }}>Retry Sync</button>
          </div>
        )}

        {/* Advanced Metrics Grid */}
        <div className="stats-grid" style={{ marginBottom: '32px' }}>
          {metrics.map((stat, i) => (
            <div key={i} className="stat-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: `${stat.color}15`, color: stat.color, borderRadius: '12px' }}>{stat.icon}</div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: stat.color, padding: '4px 8px', background: `${stat.color}10`, borderRadius: '8px' }}>
                  {stat.trend}
                </span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>{loading ? '...' : stat.value}</div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Visual Trends Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800 }}>Weekly Patient Flow</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '20px', border: '1px solid #f1f5f9', borderRadius: '16px' }}>
              {stats?.weeklyFlow?.length > 0 ? (
                stats.weeklyFlow.map((day: any, idx: number) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '100%', 
                      height: `${(day.count / Math.max(...stats.weeklyFlow.map((d: any) => d.count), 1)) * 150}px`, 
                      background: 'linear-gradient(to top, #3b82f6, #60a5fa)', 
                      borderRadius: '6px',
                      minHeight: '4px'
                    }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>
                ))
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8' }}>No flow data recorded for this week.</div>
              )}
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800 }}>Clinical Load</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {stats?.departmentLoad?.length > 0 ? (
                 stats.departmentLoad.map((dept: any, i: number) => (
                   <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                         <span>{dept.name}</span>
                         <span>{dept.count} Active</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ 
                           width: `${Math.min((dept.count / (stats.metrics.patientInflow || 1)) * 100, 100)}%`, 
                           height: '100%', 
                           background: '#3b82f6' 
                         }}></div>
                      </div>
                   </div>
                 ))
               ) : (
                 <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No active clinical sessions.</div>
               )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', color: '#0f172a' }}>Priority Workflows</h2>
        <div className="action-grid">
          <div className="action-card" onClick={() => navigate('/tenant/opd/queue')} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Plus />
            </div>
            <div className="action-content">
              <h3>Clinical Consultation</h3>
              <p>Execute precision patient encounters</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/tenant/appointments')}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Appointments />
            </div>
            <div className="action-content">
              <h3>Schedule Appointment</h3>
              <p>Book a future slot for a patient</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/billing')}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Billing />
            </div>
            <div className="action-content" style={{ flex: 1 }}>
              <h3>Generate Bill</h3>
              <p>Create invoice for pending services</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
