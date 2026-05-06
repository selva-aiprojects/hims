import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { Shield, Plus, Filter, Search, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function InsurancePage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [claimsRes, provRes] = await Promise.all([
        axios.get(`${API_BASE}/api/insurance/claims`, { headers }),
        axios.get(`${API_BASE}/api/insurance/providers`, { headers })
      ]);
      setClaims(claimsRes.data);
      setProviders(provRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('approved') || s.includes('settled')) return '#10b981';
    if (s.includes('pending') || s.includes('pre-auth')) return '#f59e0b';
    if (s.includes('rejected')) return '#ef4444';
    return '#64748b';
  };

  const filteredClaims = claims.filter(c => 
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Insurance & TPA Management" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={28} color="#0ea5e9" />
              Claims & Settlements
            </h2>
            <p style={{ color: '#64748b' }}>Manage multi-TPA pre-authorizations and reference claim tracking</p>
          </div>
          <button 
            onClick={() => alert("Please initiate claims from the Billing Center for direct invoice linking.")}
            style={{ 
              padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', 
              borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' 
            }}
          >
            <Plus size={18} /> INITIATE NEW CLAIM
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Active Claims', val: claims.length, icon: FileText, color: '#3b82f6' },
            { label: 'Pre-Auth Pending', val: claims.filter(c => c.status.includes('PENDING')).length, icon: Clock, color: '#f59e0b' },
            { label: 'Settled Today', val: '₹ 0', icon: CheckCircle, color: '#10b981' },
            { label: 'Rejected/Query', val: claims.filter(c => c.status.includes('REJECTED')).length, icon: AlertCircle, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '12px', background: `${s.color}10` }}>
                    <s.icon size={20} color={s.color} />
                  </div>
               </div>
               <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', margin: 0 }}>{s.label}</p>
               <p style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }} />
              <input 
                placeholder="Search by Patient Name, MRN or Claim #..."
                style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} /> Filters
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Patient & Plan Info</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>TPA / Provider</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Claim & Ref #</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Financials</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '80px', textAlign: 'center' }}>
                  <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8' }}>No insurance claims matching your search.</p>
                </td></tr>
              ) : filteredClaims.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{c.patient_name}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{c.mrn}</span>
                      <span style={{ fontSize: '10px', background: '#eff6ff', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{c.claim_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{c.provider_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Policy: {c.policy_number}</p>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Bill Ref: {c.reference_number || 'N/A'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Claim: {c.claim_number || 'WAITING'}</p>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>₹{Number(c.billed_amount).toLocaleString()}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Sanc: ₹{Number(c.sanctioned_amount).toLocaleString()}</p>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <span style={{ 
                        fontSize: '11px', background: `${getStatusColor(c.status)}15`, 
                        color: getStatusColor(c.status), padding: '6px 12px', 
                        borderRadius: '20px', fontWeight: 800 
                     }}>
                        {c.status.toUpperCase()}
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
