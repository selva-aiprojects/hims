import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

const API_BASE = "http://localhost:4000";

const Icons = {
  Wallet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  ),
  Receipt: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5V6.5" />
    </svg>
  )
};

type BillType = 'OPD' | 'LAB' | 'PHARMACY' | 'IPD' | 'DAYCARE' | 'DISCHARGE';

export default function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const state = location.state as { billType?: BillType; totalAmount?: number; patientName?: string; encounterId?: string } | null;

  const [loading, setLoading] = useState(false);
  const [billType, setBillType] = useState<BillType>(state?.billType || 'OPD');
  
  // Amounts
  const [totalAmount, setTotalAmount] = useState(state?.totalAmount || 0);
  const [insuranceClaim, setInsuranceClaim] = useState(0);
  const [directContribution, setDirectContribution] = useState(state?.totalAmount || 0);

  useEffect(() => {
    // Security Guard
    if (!role) {
      navigate("/");
      return;
    }
  }, [role, navigate]);

  // Sync direct contribution if total or insurance changes
  useEffect(() => {
    if (billType === 'IPD' || billType === 'DAYCARE' || billType === 'DISCHARGE') {
      setDirectContribution(totalAmount - insuranceClaim);
    } else {
      setDirectContribution(totalAmount);
      setInsuranceClaim(0);
    }
  }, [totalAmount, insuranceClaim, billType]);

  const processBilling = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/billing`, {
        patientId: state?.encounterId || "p1",
        billType,
        totalAmount,
        insuranceClaim,
        directContribution,
        status: insuranceClaim > 0 ? 'PARTIAL_INSURANCE' : 'PAID',
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-tenant-id": localStorage.getItem("tenant") || "",
        }
      });
      alert(`Invoice generated for ${state?.patientName || "Patient"}. Payment successful.`);
      navigate("/tenant/dashboard");
    } catch (err) {
      console.error(err);
      alert("Billing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Billing & Revenue Center" />

        <div style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
               <div className="stat-card" style={{ borderLeft: '4px solid #10b981', padding: '24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Daily Collection</p>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>₹ 0.00</p>
               </div>
               <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6', padding: '24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Insurance Pending</p>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>₹ 0.00</p>
               </div>
            </div>

            <div className="manage-card" style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <Icons.Receipt />
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Settlement Details</h3>
               </div>
               
               {state?.patientName && (
                 <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>Processing bill for: <strong style={{ fontSize: '15px' }}>{state.patientName}</strong></p>
                 </div>
               )}

               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}>Revenue Category</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {['OPD', 'LAB', 'PHARMACY', 'IPD', 'DAYCARE', 'DISCHARGE'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setBillType(type as BillType)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: billType === type ? '#0f172a' : 'white',
                            color: billType === type ? 'white' : '#64748b',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}>Total Outstanding (INR)</label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '20px', fontWeight: 800 }}
                    />
                  </div>
               </div>
            </div>
          </div>

          <aside>
             <div style={{ background: '#0f172a', padding: '32px', borderRadius: '28px', color: 'white', position: 'sticky', top: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                   <Icons.Wallet />
                   <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Payment Summary</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>Gross Amount</span>
                      <span style={{ fontWeight: 700 }}>₹{totalAmount.toFixed(2)}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>GST (Included)</span>
                      <span style={{ fontWeight: 700 }}>₹0.00</span>
                   </div>
                   <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '18px' }}>Net Payable</span>
                      <span style={{ fontWeight: 900, fontSize: '24px', color: '#10b981' }}>₹{totalAmount.toFixed(2)}</span>
                   </div>
                </div>

                <button
                  onClick={processBilling}
                  disabled={loading || totalAmount <= 0}
                  style={{
                    width: '100%',
                    padding: '18px',
                    borderRadius: '16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {loading ? 'PROCESSING...' : 'GENERATE INVOICE'}
                </button>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
