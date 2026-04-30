"use client";

import React from 'react';

const Icons = {
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
};

export default function Header({ title }: { title: string }) {
  const userName = "Dr. Sarah Wilson";

  return (
    <header className="dashboard-header">
      <div className="welcome-msg">
        <h1>{title}</h1>
        <p>Tenant: Modern Hospitals Pvt Ltd</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            style={{ 
              padding: '10px 16px 10px 40px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              background: 'white',
              width: '200px'
            }} 
          />
        </div>
        <button style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <Icons.Bell />
        </button>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
            <span>SW</span>
        </div>
      </div>
    </header>
  );
}
