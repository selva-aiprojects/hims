import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function IPDAdmissionsList() {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    axios.get(`${API_BASE}/api/hospital/ipd/admissions`, { headers })
      .then(r => setAdmissions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const daysSince = (date: string) => {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="IPD Active Census" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Active Admissions</h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>All currently admitted in-patients across all wards</p>
          </div>
          <button
            onClick={() => navigate('/tenant/ipd/beds')}
            style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}
          >
            🛏️ Open Bed Map
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Patient</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Ward / Bed</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Admitted</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>LOS</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Daily Charge</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Accrued</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>Loading admissions...</td></tr>
              ) : admissions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '100px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '40px', marginBottom: '16px' }}>🛏️</div>
                    <div style={{ color: '#94a3b8', fontWeight: 600 }}>No active admissions. Use the Bed Map to admit a patient.</div>
                  </td>
                </tr>
              ) : admissions.map((a, i) => {
                const los = daysSince(a.admitted_at) || 1;
                const accrued = los * Number(a.daily_charge);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{a.patient_name}</div>
                      <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{a.mrn} · {a.age}y {a.gender}</div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontWeight: 700 }}>{a.ward_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Bed: <strong>{a.bed_number}</strong></div>
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '13px', color: '#64748b' }}>
                      {new Date(a.admitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontWeight: 900, color: los > 7 ? '#ef4444' : '#f59e0b', background: los > 7 ? '#fee2e2' : '#fffbeb', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                        {los} days
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', fontWeight: 700 }}>₹{Number(a.daily_charge).toFixed(0)}/day</td>
                    <td style={{ padding: '20px 24px', fontWeight: 900, color: '#0f172a' }}>₹{accrued.toFixed(0)}</td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/tenant/ipd/admissions/${a.id}`)}
                        style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
