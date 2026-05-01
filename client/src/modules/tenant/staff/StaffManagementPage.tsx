import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'doctor' });

  const fetchStaff = async () => {
    const role = localStorage.getItem("userType");
    if (role !== 'admin' && localStorage.getItem("userRole") !== 'admin') {
      navigate("/tenant/dashboard");
      return;
    }

    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      const res = await axios.get(`${API_BASE}/api/hospital/staff`, { headers });
      setStaff(res.data);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStaff(); 
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      await axios.post(`${API_BASE}/api/hospital/staff`, formData, { headers });
      alert("Staff member added successfully!");
      setShowModal(false);
      fetchStaff();
    } catch (err) { 
        alert("Failed to add staff"); 
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Staff & RBAC" />

        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div className="welcome-msg">
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Staff & RBAC</h1>
            <p>Manage hospital users and access permissions.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Staff Member
          </button>
        </header>

        <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading staff records...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>STAFF NAME</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>EMAIL</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>ROLE</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>JOINED</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{member.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{member.email}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: member.role === 'admin' ? '#fee2e2' : '#f0f9ff',
                        color: member.role === 'admin' ? '#ef4444' : '#3b82f6'
                      }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px' }}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && !loading && (
                    <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No staff found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 800 }}>Add Staff Member</h2>
              <form onSubmit={handleAddStaff}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Full Name</label>
                  <input 
                    required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Email Address</label>
                  <input 
                    type="email" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Temporary Password</label>
                  <input 
                    type="password" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Role</label>
                  <select 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="receptionist">Front Desk</option>
                    <option value="billing">Billing Officer</option>
                    <option value="admin">Hospital Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create User</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
