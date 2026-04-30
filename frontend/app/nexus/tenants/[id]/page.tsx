"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import NexusSidebar from "../../../components/NexusSidebar";

const API_BASE = "http://localhost:4000";

const Icons = {
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
  Trash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
};

export default function ManageTenant() {
  const { id } = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPlan, setNewPlan] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/nexus/tenants/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setTenant(res.data);
        setNewPlan(res.data.plan);
      } catch (err) {
        console.error("Failed to fetch tenant", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [id]);

  const handleUpdatePlan = async () => {
    if (!confirm(`Upgrade ${tenant.name} to ${newPlan} plan?`)) return;
    try {
      await axios.patch(`${API_BASE}/api/nexus/tenants/${id}/plan`, { plan: newPlan }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Subscription upgraded successfully!");
      router.refresh();
    } catch (err) { alert("Failed to upgrade plan"); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !adminEmail) return alert("Please provide both admin email and new password");
    try {
      await axios.patch(`${API_BASE}/api/nexus/tenants/${id}/password`, { newPassword, adminEmail }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Password reset successfully!");
      setNewPassword("");
    } catch (err) { alert("Failed to reset password"); }
  };

  const handleDeleteTenant = async () => {
    if (!confirm(`CRITICAL: Are you sure you want to decommission ${tenant.name}? All shard data will be permanently deleted.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/nexus/tenants/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Tenant decommissioned successfully.");
      router.push("/nexus/tenants");
    } catch (err) { alert("Failed to delete tenant"); }
  };

  if (loading) return <div className="dashboard-layout"><NexusSidebar /><main className="main-content">Loading...</main></div>;
  if (!tenant) return <div className="dashboard-layout"><NexusSidebar /><main className="main-content">Tenant not found</main></div>;

  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <button onClick={() => router.back()} className="back-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '16px', fontWeight: 600 }}>
              <Icons.ChevronLeft /> Back to Tenants
            </button>
            <h1>Manage {tenant.name}</h1>
            <p>Infrastructure control and shard management for <code>{tenant.dbName}</code></p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1000px' }}>
          {/* Subscription Section */}
          <div className="manage-card" style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#8b5cf6' }}>
              <Icons.Zap />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Subscription Tier</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Update the hospital's feature set and resource limits.</p>
            <select 
              value={newPlan} 
              onChange={(e) => setNewPlan(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}
            >
              <option value="Basic">Basic (OPD Only)</option>
              <option value="Standard">Standard (OPD + IPD)</option>
              <option value="Professional">Professional (Full Suite)</option>
              <option value="Enterprise">Enterprise (Multi-Site)</option>
            </select>
            <button 
              onClick={handleUpdatePlan}
              className="action-btn" 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#8b5cf6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Update Subscription
            </button>
          </div>

          {/* Password Reset Section */}
          <div className="manage-card" style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#f59e0b' }}>
              <Icons.Shield />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Security Access</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Reset the shard administrator's password.</p>
            <input 
              placeholder="Admin Login Email" 
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}
            />
            <input 
              type="password"
              placeholder="New Admin Password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}
            />
            <button 
              onClick={handleResetPassword}
              className="action-btn" 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Reset Shard Password
            </button>
          </div>

          {/* Danger Zone */}
          <div className="manage-card" style={{ background: '#fff1f2', padding: '32px', borderRadius: '24px', border: '1px solid #fecdd3', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#e11d48' }}>
              <Icons.Trash />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Danger Zone</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#9f1239', fontSize: '14px', maxWidth: '600px', margin: 0 }}>
                Decommissioning this tenant will permanently drop the <strong>{tenant.dbName}</strong> schema. This action cannot be undone.
              </p>
              <button 
                onClick={handleDeleteTenant}
                style={{ padding: '12px 24px', borderRadius: '12px', background: '#e11d48', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Delete Tenant
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
