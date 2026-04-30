"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

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

export default function TenantDashboard() {
  const [userName, setUserName] = useState("Dr. Sarah Wilson");

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title={`Welcome back, ${userName.split(' ')[1]}`} />

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Icons.Appointments />
              </div>
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>+12%</span>
            </div>
            <div>
              <div className="stat-value">24</div>
              <div className="stat-label">Appointments Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Icons.Patients />
              </div>
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>+5%</span>
            </div>
            <div>
              <div className="stat-value">1,284</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Icons.Billing />
              </div>
              <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>-2%</span>
            </div>
            <div>
              <div className="stat-value">$12,450</div>
              <div className="stat-label">Revenue This Month</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#0f172a' }}>Quick Actions</h2>
        <div className="action-grid">
          <div className="action-card" onClick={() => window.location.href = '/consultation'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Plus />
            </div>
            <div className="action-content">
              <h3>New Consultation</h3>
              <p>Start a new clinical visit for a patient</p>
            </div>
          </div>

          <div className="action-card" onClick={() => window.location.href = '/appointments'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Appointments />
            </div>
            <div className="action-content">
              <h3>Schedule Appointment</h3>
              <p>Book a future slot for a patient</p>
            </div>
          </div>

          <div className="action-card" onClick={() => window.location.href = '/billing'}>
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
