import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NexusSidebar from "../../components/NexusSidebar";

export default function NexusUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (role !== 'nexus') {
      navigate("/");
      return;
    }
    setUsers([
      { id: 1, name: "Admin User", email: "admin@hmis-sys.com", role: "Super Admin", status: "Active" },
      { id: 2, name: "System Support", email: "support@hmis-sys.com", role: "Manager", status: "Active" },
    ]);
  }, [role, navigate]);

  return (
    <div className="dashboard-layout">
      <NexusSidebar />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-msg">
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Super Admin Management</h1>
            <p>Control platform-wide access and permissions.</p>
          </div>
          <button style={{ padding: '10px 20px', borderRadius: '12px', background: '#8b5cf6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>+ Add Admin</button>
        </header>

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>NAME</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>EMAIL</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ROLE</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '16px 24px', color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '16px 24px' }}>{u.role}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ padding: '4px 12px', background: '#ecfdf5', color: '#059669', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
