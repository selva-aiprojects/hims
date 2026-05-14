import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  History, FileText, Receipt, Search, Filter, 
  Download, Printer, ChevronRight, User, Calendar, Pill, FlaskConical 
} from "lucide-react";

export default function HistoricalArchivesPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"bills" | "prescriptions">("bills");

  const headers = { 
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billRes, presRes] = await Promise.all([
        axios.get(`${API_BASE}/api/billing/history`, { headers }),
        axios.get(`${API_BASE}/api/hospital/encounters?status=Completed`, { headers })
      ]);
      setBills(billRes.data || []);
      setPrescriptions(presRes.data || []);
    } catch (err) {
      console.error("Failed to fetch archives", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(b => 
    b.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrescriptions = prescriptions.filter(p => 
    p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-layout" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '32px' }}>
        <Header title="Clinical & Financial Archives" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
               <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Patient Archives</h2>
               <p style={{ color: '#64748b', margin: 0 }}>Access historical billing records and clinical prescriptions across all departments.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
               <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    placeholder="Search by Patient or ID..." 
                    style={{ padding: '14px 16px 14px 44px', borderRadius: '14px', border: '1px solid #e2e8f0', width: '320px', outline: 'none' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px', borderRadius: '16px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
             <button 
              onClick={() => setActiveTab('bills')}
              style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'bills' ? '#0f172a' : 'transparent', color: activeTab === 'bills' ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
             >
               <Receipt size={18} /> Billing History
             </button>
             <button 
              onClick={() => setActiveTab('prescriptions')}
              style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'prescriptions' ? '#0f172a' : 'transparent', color: activeTab === 'prescriptions' ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
             >
               <FileText size={18} /> Prescription History
             </button>
          </div>

          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>Loading historical data...</div>
          ) : (
            <div className="page-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '20px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>{activeTab === 'bills' ? 'INVOICE' : 'CONSULTATION'}</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>PATIENT</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>DATE</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>DETAILS</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', color: '#64748b', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'bills' ? (
                    filteredBills.map((bill, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 800, color: '#0f172a' }}>{bill.invoice_number || `#INV-${bill.id.substring(0,6)}`}</div>
                           <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{bill.bill_type}</div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 700 }}>{bill.patient_name}</div>
                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>MRN: {bill.patient_mrn || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '20px 24px', color: '#64748b', fontSize: '14px' }}>
                           {new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 800, color: '#10b981' }}>₹ {Number(bill.total_amount || bill.total || 0).toLocaleString()}</div>
                           <div style={{ fontSize: '11px', color: '#64748b' }}>Mode: {bill.payment_mode}</div>
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                           <button onClick={() => window.print()} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer' }}>
                              <Printer size={16} />
                           </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredPrescriptions.map((pres, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 800, color: '#0f172a' }}>OPD VISIT</div>
                           <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>{pres.doctor_name}</div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 700 }}>{pres.patient_name}</div>
                           <div style={{ fontSize: '11px', color: '#94a3b8' }}>MRN: {pres.mrn}</div>
                        </td>
                        <td style={{ padding: '20px 24px', color: '#64748b', fontSize: '14px' }}>
                           {new Date(pres.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{pres.diagnosis}</div>
                           <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>{pres.notes?.substring(0, 40)}...</div>
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                           <button onClick={() => window.print()} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer' }}>
                              <Printer size={16} />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {(activeTab === 'bills' ? filteredBills : filteredPrescriptions).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                        No historical records matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
