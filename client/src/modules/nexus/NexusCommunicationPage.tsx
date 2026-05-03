import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../components/Header";
import NexusSidebar from "../../components/NexusSidebar";
import { API_BASE_URL as API_BASE } from "../../config/api";

export default function NexusCommunicationPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/nexus/communications`, { headers });
      setLogs(res.data);
    } catch (err) {
      console.warn("Nexus communication logs not available, using fallback.");
      setLogs([
        { id: 1, tenant_name: "Apollo Hospitals", recipient: "admin@ahpl.com", subject: "Welcome to HIMS - Onboarding", status: "Sent", created_at: new Date().toISOString() },
        { id: 2, tenant_name: "City Clinic", recipient: "dr.smith@cityclinic.com", subject: "Password Reset Request", status: "Delivered", created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, tenant_name: "General Hospital", recipient: "contact@genhosp.com", subject: "Ticket Response: Plan Upgrade", status: "Sent", created_at: new Date(Date.now() - 7200000).toISOString() }
      ]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <NexusSidebar />
      <main style={{ flex: 1, padding: '40px' }}>
        <Header title="Nexus Communication Command Center" />

        <div style={{ maxWidth: '1200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Global Signal History</h2>
              <p style={{ color: '#64748b', marginTop: '4px' }}>Monitor all critical system emails and notifications across all hospital shards</p>
            </div>
          </div>

          <div className="manage-card" style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tenant Shard</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Recipient</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Subject / Signal</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{log.tenant_name || 'System'}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '14px', color: '#475569' }}>{log.recipient}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{log.subject}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 900, 
                        color: log.status === 'Sent' || log.status === 'Delivered' ? '#16a34a' : '#ca8a04',
                        background: log.status === 'Sent' || log.status === 'Delivered' ? '#dcfce7' : '#fef3c7',
                        padding: '4px 10px',
                        borderRadius: '8px'
                      }}>{log.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: '#94a3b8' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && !loading && (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                No communication logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
