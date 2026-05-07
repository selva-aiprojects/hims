import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

import { API_BASE_URL as API_BASE } from "../../../config/api";

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'rbac'>('list');
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    license_number: '',
    age: '',
    qualifications: '',
    experience_years: '',
    specialization: '',
    department: '',
    gender: 'Male',
    dob: '',
    doj: ''
  });

  const SPECIALIZATIONS = [
    'General Physician', 'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology', 
    'Gynecology', 'Nephrology', 'Neurology', 'Oncology', 'Ophthalmology', 
    'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Urology'
  ];

  // All valid system roles
  const ROLES = [
    { value: 'admin',         label: 'Admin',           desc: 'Full system access' },
    { value: 'doctor',        label: 'Doctor',          desc: 'OPD, prescriptions, lab orders' },
    { value: 'lab_assistant', label: 'Lab Assistant',   desc: 'Lab queue, result entry only' },
    { value: 'pharmacist',    label: 'Pharmacist',      desc: 'Inventory, dispensing, prescription queue' },
    { value: 'receptionist',  label: 'Receptionist',    desc: 'Patient registration, appointments' },
    { value: 'nurse',         label: 'Nurse',           desc: 'Vitals, in-patient care' },
    { value: 'staff',         label: 'General Staff',   desc: 'Read-only access' },
  ];

  const fetchStaff = async (search: string = "") => {
    const currentRole = (localStorage.getItem("role") || "").toLowerCase();

    if (currentRole !== 'admin' && currentRole !== 'nexus') {
      navigate("/tenant/dashboard");
      return;
    }

    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      const url = search 
        ? `${API_BASE}/api/hospital/staff?search=${encodeURIComponent(search)}`
        : `${API_BASE}/api/hospital/staff`;
        
      const res = await axios.get(url, { headers });
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

  // Handle Search on Enter or debounced
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'list') {
        fetchStaff(searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'doctor',
      license_number: '',
      age: '',
      qualifications: '',
      experience_years: '',
      specialization: '',
      department: '',
      gender: 'Male',
      dob: '',
      doj: ''
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (member: any) => {
    setFormData({
      name: member.name || '',
      email: member.email || '',
      password: '', // Don't show password during edit
      role: member.role || 'doctor',
      license_number: member.license_number || '',
      age: member.age || '',
      qualifications: member.qualifications || '',
      experience_years: member.experience_years || '',
      specialization: member.specialization || '',
      department: member.department || '',
      gender: member.gender || 'Male',
      dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : '',
      doj: member.doj ? new Date(member.doj).toISOString().split('T')[0] : ''
    });
    setEditId(member.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDobChange = (val: string) => {
    setFormData(prev => {
      const newData = { ...prev, dob: val };
      if (val) {
        const birthDate = new Date(val);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        newData.age = String(age);
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      
      if (isEditing && editId) {
        await axios.put(`${API_BASE}/api/hospital/staff/${editId}`, formData, { headers });
        alert("Staff member updated successfully!");
      } else {
        await axios.post(`${API_BASE}/api/hospital/staff`, formData, { headers });
        alert("Staff member added successfully!");
      }
      
      setShowModal(false);
      fetchStaff(searchTerm);
    } catch (err: any) { 
        const msg = err.response?.data?.error || "Operation failed";
        alert(msg); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
    
    try {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      await axios.delete(`${API_BASE}/api/hospital/staff/${id}`, { headers });
      alert("Staff member deleted successfully!");
      fetchStaff(searchTerm);
    } catch (err: any) {
      alert("Failed to delete staff member");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Staff & RBAC" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', width: '350px' }}>
             <input 
               type="text"
               placeholder="Search by name, role or department..."
               style={{ 
                 width: '100%', 
                 padding: '12px 16px 12px 40px', 
                 borderRadius: '12px', 
                 border: '1px solid #e2e8f0',
                 fontSize: '14px',
                 fontWeight: 600,
                 background: 'white'
               }}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
          </div>
          
          <button 
            onClick={handleOpenAddModal}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Staff Member
          </button>
        </div>

        {/* Staff Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Total Staff</p>
            <h3 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>{staff.length}</h3>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Doctors</p>
            <h3 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>{staff.filter(s => s.role === 'doctor').length}</h3>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Nurses</p>
            <h3 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>{staff.filter(s => s.role === 'nurse').length}</h3>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>System Status</p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#10b981' }}>● ONLINE</h3>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
          <button 
            onClick={() => setActiveTab('list')}
            style={{ 
              padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              background: activeTab === 'list' ? 'white' : 'transparent',
              boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Staff Directory
          </button>
          <button 
            onClick={() => setActiveTab('rbac')}
            style={{ 
              padding: '8px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              background: activeTab === 'rbac' ? 'white' : 'transparent',
              boxShadow: activeTab === 'rbac' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Access Permissions (RBAC)
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading && staff.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading staff records...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>STAFF NAME</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>EMAIL / ROLE</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>DETAILS</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>GENDER / DOB</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>JOINED (DOJ)</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>ID: {member.id.substring(0,8)}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>{member.email}</div>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '10px', 
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: member.role === 'admin' ? '#fee2e2' : '#f0f9ff',
                          color: member.role === 'admin' ? '#ef4444' : '#3b82f6',
                          display: 'inline-block',
                          marginTop: '4px'
                        }}>
                          {member.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>
                        {member.role === 'doctor' ? (
                          <>
                            <div>Lic: {member.license_number || 'N/A'}</div>
                            <div>Spec: {member.specialization || 'N/A'}</div>
                          </>
                        ) : (
                          <>
                            <div>Dept: {member.department || 'N/A'}</div>
                            <div>Exp: {member.experience_years || '0'} yrs</div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{member.gender || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {member.dob ? new Date(member.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DOB: N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {member.doj ? new Date(member.doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Created: {new Date(member.created_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenEditModal(member)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: '#f1f5f9', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(member.id)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No staff found matching "{searchTerm}"</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '16px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '16px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Scope</th>
                  <th style={{ padding: '16px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>OPD/IPD Access</th>
                  <th style={{ padding: '16px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Lab/Pharmacy</th>
                  <th style={{ padding: '16px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Admin/Masters</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'admin',         scope: 'Full System', opd_ipd: '✅ Full', diag: '✅ Full', admin: '✅ Full' },
                  { role: 'doctor',        scope: 'Clinical',    opd_ipd: '✅ Full', diag: '📋 View', admin: '❌' },
                  { role: 'nurse',         scope: 'Clinical',    opd_ipd: '📋 IPD/Vitals', diag: '❌', admin: '❌' },
                  { role: 'lab_assistant', scope: 'Diagnostics', opd_ipd: '❌',       diag: '✅ Lab',  admin: '❌' },
                  { role: 'pharmacist',    scope: 'Diagnostics', opd_ipd: '❌',       diag: '✅ Phar', admin: '❌' },
                  { role: 'receptionist',  scope: 'Front Office', opd_ipd: '📋 Reg',  diag: '❌',      admin: '❌' },
                  { role: 'staff',         scope: 'Support',     opd_ipd: '❌',       diag: '❌',      admin: '❌' },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', color: '#0f172a', textTransform: 'capitalize' }}>
                        {r.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>{r.scope}</td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>{r.opd_ipd}</td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>{r.diag}</td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>{r.admin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 800 }}>{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Full Name</label>
                    <input 
                      required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Email Address</label>
                    <input 
                      type="email" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Temporary Password</label>
                    <input 
                      type="password" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Role</label>
                  <select 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0' }} />
                
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', color: '#1e293b' }}>Professional Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Gender</label>
                    <select 
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Date of Birth</label>
                    <input 
                      type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.dob} onChange={e => handleDobChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Age</label>
                    <input 
                      type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Date of Joining</label>
                    <input 
                      type="date" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.doj} onChange={e => setFormData({...formData, doj: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Years of Experience</label>
                    <input 
                      type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Qualifications</label>
                  <input 
                    placeholder="e.g. MBBS, MD, PhD"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                    value={formData.qualifications} onChange={e => setFormData({...formData, qualifications: e.target.value})}
                  />
                </div>

                {formData.role === 'doctor' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>License Number</label>
                      <input 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                        value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Specialization</label>
                      <select 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                        value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})}
                      >
                        <option value="">Select Specialization</option>
                        {SPECIALIZATIONS.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Department</label>
                    <input 
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {isEditing ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
