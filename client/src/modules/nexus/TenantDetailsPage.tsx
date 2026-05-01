import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import NexusSidebar from "../../components/NexusSidebar";

const API_BASE = "http://localhost:4000";

export default function TenantDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (role !== 'nexus') {
      navigate("/");
      return;
    }

    const fetchTenant = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/nexus/tenants/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setTenant(res.data);
      } catch (err) {
        console.error(err);
        navigate("/nexus/tenants");
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [id, role, navigate]);

  const resetPassword = async () => {
    if (!newPassword) return alert("Please enter a new password");
    if (!window.confirm(`Are you sure you want to reset the admin password for ${tenant.name}?`)) return;
    
    setActionLoading(true);
    try {
      await axios.patch(`${API_BASE}/api/nexus/tenants/${id}/password`, {
        newPassword,
        adminEmail: "admin@hospital.com" // In production, this would be fetched from tenant contacts
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Password reset successfully and notification sent to hospital admin.");
      setNewPassword("");
    } catch (err) {
      alert("Failed to reset password. Please check backend connectivity.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteShard = async () => {
    const confirmation = window.prompt(`Type DELETE to confirm decommissioning ${tenant.name}. This will PERMANENTLY erase all patient data.`);
    if (confirmation !== "DELETE") return;

    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/api/nexus/tenants/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Shard decommissioned and deleted successfully.");
      navigate("/nexus/tenants");
    } catch (err) {
      alert("Failed to delete shard. It might be in use or connection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading shard details...</div>;
  if (!tenant) return <div style={{ padding: '40px', textAlign: 'center' }}>Shard not found.</div>;

  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header" style={{ marginBottom: '32px' }}>
          <div className="welcome-msg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => navigate('/nexus/tenants')} style={{ background: 'none', border: 'none', color: '#8b5cf6', fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back to Shards</button>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900 }}>{tenant.name}</h1>
            <p style={{ color: '#64748b' }}>Shard ID: {tenant.id} • Status: <span style={{ color: '#10b981', fontWeight: 700 }}>Healthy</span></p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Configuration Card */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Technical Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>DATABASE SCHEMA</p>
                   <p style={{ fontWeight: 800, color: '#0f172a' }}>{tenant.db_name || tenant.code}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>SUBSCRIPTION PLAN</p>
                   <p style={{ fontWeight: 800, color: '#8b5cf6' }}>{tenant.plan}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>PROVISIONED ON</p>
                   <p style={{ fontWeight: 800, color: '#0f172a' }}>{new Date(tenant.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>OFFICIAL CONTACT</p>
                   <p style={{ fontWeight: 800, color: '#0f172a' }}>{tenant.contact_email || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>SYSTEM ADMIN</p>
                   <p style={{ fontWeight: 800, color: '#0f172a' }}>{tenant.admin_email || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>RESOURCE USAGE</p>
                   <p style={{ fontWeight: 800, color: '#0f172a' }}>0.42 GB / 20 GB</p>
                </div>
              </div>
            </div>

            {/* Security Actions */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', color: '#ef4444' }}>Security Controls</h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Force Reset Admin Password</label>
                  <input 
                    type="text" 
                    placeholder="Enter new complex password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                  />
                </div>
                <button 
                  onClick={resetPassword}
                  disabled={actionLoading}
                  style={{ padding: '14px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Processing...' : 'Execute Reset'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>This will immediately update the shard's admin account and send a notification email.</p>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: '#fef2f2', padding: '24px', borderRadius: '24px', border: '1px solid #fee2e2' }}>
               <h4 style={{ color: '#991b1b', fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>Danger Zone</h4>
               <p style={{ fontSize: '13px', color: '#b91c1c', marginBottom: '16px' }}>Decommissioning a tenant will permanently delete the database shard and all patient data. This action is irreversible.</p>
               <button 
                 onClick={deleteShard}
                 disabled={actionLoading}
                 style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
               >
                 {actionLoading ? 'Deleting...' : 'Delete Shard'}
               </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
