import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";

export default function InsurancePage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/billing/insurance-claims`, { headers });
      setClaims(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Insurance & TPA Management" />
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>Insurance Claims Dashboard</h2>
          <p style={{ color: '#64748b' }}>Monitor pre-authorizations and settlement status</p>
        </div>

        <div style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>PATIENT / POLICY</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>PROVIDER</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>AMOUNT</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No active insurance claims found.</td></tr>
              ) : claims.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>{c.patient_name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Pol: {c.policy_number}</p>
                  </td>
                  <td style={{ padding: '20px 24px', fontWeight: 600 }}>{c.insurance_company}</td>
                  <td style={{ padding: '20px 24px', fontWeight: 800 }}>₹{c.claim_amount}</td>
                  <td style={{ padding: '20px 24px' }}>
                     <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 900 }}>{c.status.toUpperCase()}</span>
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
