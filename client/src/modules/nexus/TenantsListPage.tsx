import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NexusSidebar from "../../components/NexusSidebar";
import NexusHeader from "../../components/Header";

const API_BASE = "http://localhost:4000";

export default function TenantsListPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/nexus/tenants`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setTenants(data);
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently DELETE ${name}?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/nexus/tenants/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Tenant deleted.");
      fetchTenants();
    } catch (err) {
      alert("Failed to delete tenant.");
    }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <NexusSidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <NexusHeader title="Infrastructure Control" />

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Active Hospital Shards</h3>
             <button 
               onClick={() => navigate('/nexus/tenants/new')}
               style={{ padding: '10px 20px', borderRadius: '12px', background: '#8b5cf6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
             >
               + Provision Tenant
             </button>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading shards...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TENANT NAME</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>SHARD ID</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>PLAN</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>{t.dbName || t.code || 'NO_SHARD'}</td>
                    <td style={{ padding: '16px 24px' }}>
                       <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>{t.plan || 'Standard'}</span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <button 
                          onClick={() => navigate(`/nexus/tenants/${t.id}`)}
                          style={{ color: '#8b5cf6', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Manage
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.name)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No tenants provisioned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
