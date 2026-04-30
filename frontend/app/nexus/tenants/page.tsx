"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import NexusSidebar from "../../components/NexusSidebar";

const API_BASE = "http://localhost:4000";

export default function Tenants() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/nexus/tenants`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        });
        setTenants(res.data);
      } catch (err) {
        console.error("Failed to fetch tenants", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <h1>Tenant Management</h1>
            <p>Managing {tenants.length} active shards across the platform.</p>
          </div>
        </header>

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Active Shards</h3>
             <button 
               onClick={() => router.push('/nexus/tenants/new')}
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
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{t.dbName}</td>
                    <td style={{ padding: '16px 24px' }}>{t.plan}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ padding: '4px 12px', background: '#ecfdf5', color: '#059669', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                        Active
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        onClick={() => router.push(`/nexus/tenants/${t.id}`)}
                        style={{ color: '#8b5cf6', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No tenants provisioned yet.</td>
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
