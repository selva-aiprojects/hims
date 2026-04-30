"use client";

import NexusSidebar from "../../components/NexusSidebar";

export default function NexusSettings() {
  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <h1>Platform Settings</h1>
            <p>Configure global parameters and security policies.</p>
          </div>
        </header>

        <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
          <section style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Security Configuration</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Multi-Factor Authentication</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Enforce MFA for all Super Admins</div>
                  </div>
                  <div style={{ width: '48px', height: '24px', background: '#8b5cf6', borderRadius: '20px', position: 'relative' }}>
                    <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }}></div>
                  </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Session Timeout</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Auto-logout after 8 hours of inactivity</div>
                  </div>
                  <button style={{ color: '#8b5cf6', background: 'none', border: 'none', fontWeight: 600 }}>Edit</button>
               </div>
            </div>
          </section>

          <section style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>API & Integration</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
               <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Nexus API Key</label>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <input readOnly value="sk_nexus_live_89234klasdf90234" style={{ flex: 1, padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontFamily: 'monospace' }} />
                    <button style={{ padding: '0 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Copy</button>
                 </div>
               </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
