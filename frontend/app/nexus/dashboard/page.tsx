"use client";

import { useState } from "react";
import NexusSidebar from "../../components/NexusSidebar";

const Icons = {
  Tenants: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Activity: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  )
};

export default function NexusDashboard() {
  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <h1>Nexus Control Plane</h1>
            <p>System Overview & Platform Health</p>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              <span>AU</span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <Icons.Tenants />
              </div>
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>+4 New</span>
            </div>
            <div>
              <div className="stat-value">128</div>
              <div className="stat-label">Total Active Tenants</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Icons.Activity />
              </div>
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Live</span>
            </div>
            <div>
              <div className="stat-value">1.2k</div>
              <div className="stat-label">Requests / Minute</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <Icons.Settings />
              </div>
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Normal</span>
            </div>
            <div>
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime Reliability</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#0f172a' }}>Management Actions</h2>
        <div className="action-grid">
          <div className="action-card" onClick={() => window.location.href = '/nexus/tenants'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Plus />
            </div>
            <div className="action-content">
              <h3>Provision New Tenant</h3>
              <p>Setup a new hospital instance in the cloud</p>
            </div>
          </div>

          <div className="action-card" onClick={() => window.location.href = '/nexus/users'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Users />
            </div>
            <div className="action-content">
              <h3>Manage Permissions</h3>
              <p>Configure RBAC and Super Admin access</p>
            </div>
          </div>

          <div className="action-card" onClick={() => window.location.href = '/nexus/activity'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Activity />
            </div>
            <div className="action-content">
              <h3>Performance Audit</h3>
              <p>View detailed system telemetry and logs</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
