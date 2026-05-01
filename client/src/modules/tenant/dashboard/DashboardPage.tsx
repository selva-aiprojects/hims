import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

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

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title={`Welcome, ${userName}`} />

        {/* Advanced Metrics Grid */}
        <div className="stats-grid" style={{ marginBottom: '32px' }}>
          {[
            { label: 'Patient Inflow', value: '0', trend: '0%', color: '#3b82f6', icon: <Icons.Patients /> },
            { label: 'Active Admissions', value: '0', trend: '0%', color: '#10b981', icon: <Icons.Appointments /> },
            { label: 'Pending Bills', value: '0', trend: '0%', color: '#f59e0b', icon: <Icons.Billing /> },
            { label: 'Daily Revenue', value: '₹ 0.00', trend: '0%', color: '#8b5cf6', icon: <Icons.Billing /> }
          ].map((stat, i) => (
            <div key={i} className="stat-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: `${stat.color}15`, color: stat.color, borderRadius: '12px' }}>{stat.icon}</div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', padding: '4px 8px', background: '#f1f5f9', borderRadius: '8px' }}>
                  {stat.trend}
                </span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Visual Trends Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800 }}>Weekly Patient Flow</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
              No flow data recorded for this week.
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800 }}>Department Load</h3>
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
               No active department sessions.
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', color: '#0f172a' }}>Priority Workflows</h2>
        <div className="action-grid">
          <div className="action-card" onClick={() => navigate('/consultation')} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Plus />
            </div>
            <div className="action-content">
              <h3>Clinical Consultation</h3>
              <p>Execute precision patient encounters</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/appointments')}>
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
            <div className="action-content">
              <h3>Generate Bill</h3>
              <p>Create invoice for pending services</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
