"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import NexusSidebar from "../../../components/NexusSidebar";

const API_BASE = "http://localhost:4000";

const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Globe: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Palette: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10c1.3 0 2.3-1 2.3-2.3 0-.5-.2-1-.5-1.4.3.1.7.1 1.1.1 4.5 0 8-3.5 8-8a10 10 0 0 0-10-10z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="13.5" cy="7.5" r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
    </svg>
  ),
  Lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
};

export default function NewTenant() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dbName, setDbName] = useState("");
  const [plan, setPlan] = useState("Standard");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // UI Settings
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1e293b");
  const [heroBgColor, setHeroBgColor] = useState("#f8fafc");
  const [overallTextColor, setOverallTextColor] = useState("#475569");

  const [loading, setLoading] = useState(false);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/nexus/tenants`, {
        name,
        dbName,
        plan,
        contactName,
        contactEmail,
        adminEmail,
        adminPassword,
        uiSettings: {
          backgroundColor: bgColor,
          textColor: textColor,
          heroBackgroundColor: heroBgColor,
          overallTextColor: overallTextColor
        }
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
      alert("Tenant Provisioned Successfully. Admin credentials sent to " + contactEmail);
      router.push("/nexus/tenants");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to provision tenant. Ensure backend is running and database is accessible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <h1>Provision New Tenant</h1>
            <p>Deploy a new isolated hospital instance with custom branding.</p>
          </div>
        </header>

        <div style={{ maxWidth: '900px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          <section style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <form onSubmit={createTenant}>
              <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>General Information</h3>
              
              <div className="input-group">
                <label className="input-label">Hospital Name</label>
                <input
                  placeholder="e.g. St. Mary's General Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Database Schema Code (Shard ID)</label>
                <div className="input-wrapper">
                   <div className="input-icon"><Icons.Globe /></div>
                   <input
                    placeholder="e.g. st_marys_hims"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Contact Person Name</label>
                  <input
                    placeholder="e.g. Dr. Smith"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Contact Email (for Communications)</label>
                  <input
                    type="email"
                    placeholder="contact@hospital.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Subscription Plan</label>
                  <select 
                    value={plan} 
                    onChange={(e) => setPlan(e.target.value)} 
                    className="form-select"
                    style={{ paddingLeft: '16px' }}
                  >
                    <option value="Basic">Basic (OPD Only)</option>
                    <option value="Standard">Standard (OPD + IPD)</option>
                    <option value="Professional">Professional (Full Suite)</option>
                    <option value="Enterprise">Enterprise (Multi-Site)</option>
                  </select>
                </div>
              </div>

              <h3 style={{ marginTop: '32px', marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Admin Credentials</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Admin Login Email</label>
                  <input
                    type="email"
                    placeholder="admin@hospital.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Admin Initial Password</label>
                  <div className="input-wrapper">
                    <div className="input-icon"><Icons.Lock /></div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '24px' }}>
                 <p style={{ fontSize: '13px', color: '#166534' }}>
                   <strong>System Note:</strong> Deployment will create an isolated schema <code>{dbName || '...'}</code> and initialize clinical tables.
                 </p>
              </div>

              <button 
                type="submit" 
                className="submit-btn" 
                disabled={loading}
                style={{ background: '#6366f1', width: '100%', justifyContent: 'center', height: '48px', borderRadius: '12px' }}
              >
                {loading ? "Provisioning System..." : <><Icons.Plus /> Deploy Tenant Instance</>}
              </button>
            </form>
          </section>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '8px', borderRadius: '8px' }}><Icons.Palette /></div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>UI Customization</h3>
              </div>
              
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px' }}>Background Color</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ border: 'none', width: '40px', height: '40px', padding: 0, borderRadius: '4px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{bgColor}</span>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px' }}>Text Color</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ border: 'none', width: '40px', height: '40px', padding: 0, borderRadius: '4px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{textColor}</span>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px' }}>Hero Background</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="color" value={heroBgColor} onChange={(e) => setHeroBgColor(e.target.value)} style={{ border: 'none', width: '40px', height: '40px', padding: 0, borderRadius: '4px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{heroBgColor}</span>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px' }}>Overall Text</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="color" value={overallTextColor} onChange={(e) => setOverallTextColor(e.target.value)} style={{ border: 'none', width: '40px', height: '40px', padding: 0, borderRadius: '4px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{overallTextColor}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>Live Preview</h4>
              <div style={{ 
                background: bgColor, 
                color: textColor, 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                fontSize: '13px'
              }}>
                <div style={{ background: heroBgColor, padding: '12px', borderRadius: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                  Hero Section
                </div>
                <p style={{ color: overallTextColor }}>Sample content text with overall color settings.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
