import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";

export default function DischargeSummariesPage() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [activeSummary, setActiveSummary] = useState<any>(null);
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

  const printSummary = () => {
    window.print();
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
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No discharge records found for current period.</td></tr>
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
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <button onClick={() => setActiveSummary(s)} style={{ padding: '10px 18px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeSummary && (
          <div className="print-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div className="print-document" style={{ width: '760px', maxHeight: '88vh', overflowY: 'auto', background: 'white', borderRadius: '20px', padding: '36px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                <button onClick={() => setActiveSummary(null)} style={{ padding: '10px 16px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                <button onClick={printSummary} style={{ padding: '10px 18px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Print</button>
              </div>

              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '18px', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>Hospital Discharge Summary</h1>
                <p style={{ margin: '8px 0 0', color: '#64748b' }}>{localStorage.getItem("tenantName") || "Healthezee Hospital"}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div><strong>Patient:</strong> {activeSummary.patient_name}</div>
                <div><strong>MRN:</strong> {activeSummary.mrn}</div>
                <div><strong>Discharge Date:</strong> {new Date(activeSummary.discharge_date).toLocaleString()}</div>
                <div><strong>Doctor:</strong> Dr. {activeSummary.doctor_name || 'Not assigned'}</div>
                <div><strong>Type:</strong> {activeSummary.discharge_type || 'STANDARD'}</div>
              </div>

              <section>
                <h2 style={{ fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Clinical Summary</h2>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#334155' }}>
                  {activeSummary.summary_text || 'Discharge summary details are not available yet. Generate an AI summary from the IPD patient record or finalize discharge documentation.'}
                </p>
              </section>

              {activeSummary.pdf_path && (
                <p className="no-print" style={{ marginTop: '20px', color: '#64748b', fontSize: '12px' }}>Generated PDF path: {activeSummary.pdf_path}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
