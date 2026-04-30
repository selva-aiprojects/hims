"use client";

import React from 'react';

const Icons = {
  Cross: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Tenants: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
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
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
};

export default function NexusSidebar() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <aside className="sidebar" style={{ background: '#1e1b4b' }}>
      <div className="sidebar-logo">
        <div style={{ background: 'white', padding: '6px', borderRadius: '8px' }}>
          <Icons.Cross />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 700 }}>nexus</h3>
      </div>

      <nav className="nav-section">
        <a href="/nexus/dashboard" className={`nav-item ${currentPath === '/nexus/dashboard' ? 'active' : ''}`} style={currentPath === '/nexus/dashboard' ? { background: '#8b5cf6' } : {}}>
          <Icons.Dashboard />
          <span>Overview</span>
        </a>
        <a href="/nexus/tenants" className={`nav-item ${currentPath === '/nexus/tenants' ? 'active' : ''}`} style={currentPath === '/nexus/tenants' ? { background: '#8b5cf6' } : {}}>
          <Icons.Tenants />
          <span>Tenants</span>
        </a>
        <a href="/nexus/users" className={`nav-item ${currentPath === '/nexus/users' ? 'active' : ''}`} style={currentPath === '/nexus/users' ? { background: '#8b5cf6' } : {}}>
          <Icons.Users />
          <span>Super Admins</span>
        </a>
        <a href="/nexus/activity" className={`nav-item ${currentPath === '/nexus/activity' ? 'active' : ''}`} style={currentPath === '/nexus/activity' ? { background: '#8b5cf6' } : {}}>
          <Icons.Activity />
          <span>System Logs</span>
        </a>
        <a href="/nexus/settings" className={`nav-item ${currentPath === '/nexus/settings' ? 'active' : ''}`} style={currentPath === '/nexus/settings' ? { background: '#8b5cf6' } : {}}>
          <Icons.Settings />
          <span>Settings</span>
        </a>
        <a href="/" className="nav-item" style={{ marginTop: 'auto' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </a>
      </nav>

      <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icons.Shield />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Secure Node</span>
        </div>
      </div>
    </aside>
  );
}
