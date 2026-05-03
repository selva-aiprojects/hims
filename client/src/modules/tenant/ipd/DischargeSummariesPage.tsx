import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";

export default function DischargeSummariesPage() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/ipd/discharges`, { headers });
      setSummaries(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Discharge Summaries Hub" />
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>Clinical Discharge Registry</h2>
          <p style={{ color: '#64748b' }}>Review and finalize patient discharge documentation</p>
        </div>

        <div style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>PATIENT / MRN</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>DISCHARGE DATE</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>DOCTOR</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>TYPE</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No discharge records found for current period.</td></tr>
              ) : summaries.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>{s.patient_name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>MRN: {s.mrn}</p>
                  </td>
                  <td style={{ padding: '20px 24px', fontWeight: 600 }}>{new Date(s.discharge_date).toLocaleDateString()}</td>
                  <td style={{ padding: '20px 24px', fontWeight: 600 }}>Dr. {s.doctor_name}</td>
                  <td style={{ padding: '20px 24px' }}>
                     <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>{s.discharge_type || 'STANDARD'}</span>
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
