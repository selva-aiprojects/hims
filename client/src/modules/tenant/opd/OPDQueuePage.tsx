import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function OPDQueuePage() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEncounters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const res = await axios.get(`${API_BASE}/api/hospital/encounters?status=Draft`, { headers });
        setEncounters(res.data);
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchEncounters();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="OPD Patient Queue" />

        <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading queue...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>PATIENT</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>ASSIGNED DOCTOR</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>VITALS</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((enc: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{enc.patient_name}</div>
                      <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, marginBottom: '4px' }}>{enc.mrn}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{enc.gender}, {enc.age} yrs</div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#475569' }}>Dr. {enc.doctor_name}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          BP: {enc.vitals?.bp || '--'}
                        </span>
                        <span style={{ fontSize: '11px', background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {enc.vitals?.temp || '--'}°F
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        onClick={() => {
                          localStorage.setItem("currentEncounter", JSON.stringify(enc));
                          navigate(`/tenant/opd/consultation`);
                        }}
                        style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Start Consult
                      </button>
                    </td>
                  </tr>
                ))}
                {encounters.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Queue is empty.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
