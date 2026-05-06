import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { API_BASE_URL as API_BASE } from "../../config/api";


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
  const state = location.state as { billType?: BillType; totalAmount?: number; patientName?: string; patientId?: string; encounterId?: string; labOrderId?: string } | null;
  const queryParams = new URLSearchParams(location.search);
  const queryType = queryParams.get('type') as BillType;

  const [loading, setLoading] = useState(false);
  const [billType] = useState<BillType>(state?.billType || queryType || 'OPD');
  
  // Patient Context
  const [patientName, setPatientName] = useState(state?.patientName || "");
  const [patientId, setPatientId] = useState(state?.patientId || "");
  const [encounterId, setEncounterId] = useState(state?.encounterId || "");

  // Master Data
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ metrics: { dailyCollection: 0, pendingInsurance: 0 } });
  const [items, setItems] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [insuranceDetails, setInsuranceDetails] = useState({
    policyNumber: "",
    insurerId: "",
    claimType: "Cashless",
    claimNumber: ""
  });

  useEffect(() => {
    const fetchMasters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const [srvRes, diagRes, treatRes, medRes, statRes, provRes] = await Promise.all([
          axios.get(`${API_BASE}/api/hospital/masters/services`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/diagnostics`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/treatments`, { headers }),
          axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers }),
          axios.get(`${API_BASE}/api/hospital/metrics/stats`, { headers }),
          axios.get(`${API_BASE}/api/insurance/providers`, { headers })
        ]);
        setServices([
          ...srvRes.data.map((s: any) => ({ ...s, masterType: 'service' })),
          ...diagRes.data.map((s: any) => ({ ...s, masterType: 'diagnostic' })),
          ...treatRes.data.map((s: any) => ({ ...s, masterType: 'treatment' })),
          ...medRes.data.map((s: any) => ({ ...s, masterType: 'medicine' }))
        ]);
        setStats(statRes.data);
        setInsuranceProviders(provRes.data);
        
        // Dynamic initial item
        const consultationPrice = srvRes.data.find((s: any) => s.category === 'Consultation' || s.name.toLowerCase().includes('consultation'))?.price || 500;
        let defaultDesc = 'Consultation Fee';
        if (state?.billType === 'PHARMACY') defaultDesc = 'Pharmacy Medicines';
        if (state?.billType === 'LAB') defaultDesc = 'Laboratory Investigation';

        setItems([{ 
          description: defaultDesc, 
          price: state?.totalAmount || Number(consultationPrice), 
          quantity: 1, 
          tax: 0 
        }]);
      } catch (err) { console.error(err); }
    };
    fetchMasters();
  }, []);

  useEffect(() => {
    if (!patientId) return;

    const fetchQueue = async () => {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const res = await axios.get(`${API_BASE}/api/billing/queue/${patientId}`, { headers });
        if (res.data.length > 0) {
          // Modular Filtering Logic: Ensure separate billing for accounts/tax clarity
          const filteredQueue = res.data.filter((item: any) => {
            const mod = item.source_module?.toUpperCase();
            if (billType === 'OPD') return mod === 'CONSULTATION' || mod === 'REGISTRATION';
            if (billType === 'PHARMACY') return mod === 'PHARMACY';
            if (billType === 'LAB') return mod === 'LAB' || mod === 'DIAGNOSTIC';
            if (billType === 'IPD' || billType === 'DISCHARGE') return true; 
            return true;
          });

          setItems(filteredQueue.map((item: any) => ({
            ...item,
            description: item.description,
            price: Number(item.unit_price || 0),
            quantity: Number(item.quantity || 1),
            tax: Number(item.tax_percent || 0),
            discount_amount: 0 
          })));
        }
      } catch (err) { console.error(err); }
    };

    fetchQueue();
  }, [patientId]);

  const addItem = (srv: any) => {
    setItems([...items, { description: srv.name, price: Number(srv.price), quantity: 1, tax: Number(srv.tax_percent || 0) }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const calculateTax = () => items.reduce((acc, item) => acc + (item.price * item.quantity * (item.tax / 100)), 0);
  const calculateDiscount = () => items.reduce((acc, item) => acc + Number(item.discount_amount || 0), 0);
  const calculateTotal = () => calculateSubtotal() + calculateTax() - calculateDiscount();

  const processBilling = async () => {
    if (!patientId) {
      alert("Please select a patient first.");
      return;
    }
    setLoading(true);
    try {
      const billRes = await axios.post(`${API_BASE}/api/billing`, {
        patientId,
        encounterId,
        billType,
        items,
        totalAmount: calculateTotal(),
        paymentMode,
        status: paymentMode === 'Insurance' ? 'PENDING_SETTLEMENT' : 'PAID',
        labOrderId: state?.labOrderId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-tenant-id": localStorage.getItem("tenant") || "",
        }
      });

      // B. If Insurance, create the claim record
      if (paymentMode === 'Insurance' && selectedProvider) {
        await axios.post(`${API_BASE}/api/insurance/claims`, {
          patientId,
          invoiceId: billRes.data.id,
          providerId: selectedProvider,
          policyNumber: insuranceDetails.policyNumber,
          insurerId: insuranceDetails.insurerId,
          claimType: insuranceDetails.claimType,
          billedAmount: calculateTotal(),
          referenceNumber: `BILL-${Date.now().toString().slice(-6)}`,
          claimNumber: insuranceDetails.claimNumber,
          status: 'PRE-AUTH PENDING'
        }, { headers: { ...headers, "x-tenant-id": localStorage.getItem("tenant") || "" } });
      }

      alert(`Invoice finalized. ${paymentMode === 'Insurance' ? 'Claim initiated for TPA settlement.' : 'Payment successful.'}`);
      navigate("/tenant/dashboard");
    } catch (err) {
      console.error(err);
      alert("Billing failed. Check if patient is correctly selected.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title={`${billType} Billing & Revenue Center`} />

        <div style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div>
            <div className="manage-card no-print" style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <Icons.Shield />
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Patient Lookup (MRN / Name)</h3>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                  <input 
                    placeholder="Search by MRN (e.g. MRN-1234) or Patient Name..."
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        const headers = { 
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                          "x-tenant-id": localStorage.getItem("tenant") || ""
                        };
                        try {
                          const res = await axios.get(`${API_BASE}/api/patients?search=${val}`, { headers });
                          if (res.data.length > 0) {
                            const p = res.data[0];
                            // Pre-fill patient info
                            (e.target as HTMLInputElement).value = `${p.name} (${p.mrn})`;
                            setPatientName(p.name);
                            setPatientId(p.id);
                            alert(`Found Patient: ${p.name}`);
                          } else {
                            alert("No patient found with this MRN/Name");
                          }
                        } catch (err) { console.error(err); }
                      }
                    }}
                  />
                  <button style={{ padding: '0 24px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Search</button>
               </div>
               {patientName && (
                 <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#166534', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>Active Patient</p>
                      <p style={{ fontSize: '16px', fontWeight: 900, color: '#166534', margin: 0 }}>{patientName}</p>
                    </div>
                    <span style={{ fontSize: '11px', background: '#166534', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>VERIFIED RECORD</span>
                 </div>
               )}
            </div>

            {/* Quick Stats */}
            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
               <div className="stat-card" style={{ borderLeft: '4px solid #10b981', padding: '24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Daily Collection</p>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>₹ {Number(stats.metrics.dailyCollection || 0).toLocaleString()}</p>
               </div>
               <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6', padding: '24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Insurance Pending</p>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>₹ {Number(stats.metrics.pendingInsurance || 0).toLocaleString()}</p>
               </div>
            </div>

            <div className="manage-card" style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icons.Receipt />
                    <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Invoice Items</h3>
                  </div>
                  <select 
                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                    onChange={(e) => {
                      const srv = services.find(s => s.id === e.target.value);
                      if (srv) addItem(srv);
                    }}
                  >
                    <option value="">+ Add Service from Master</option>
                    {services.filter((s: any) => {
                      if (billType === 'OPD') return s.type === 'consultation' || s.category === 'Consultation';
                      if (billType === 'LAB') return s.masterType === 'diagnostic' || s.type === 'lab' || s.category === 'Laboratory';
                      if (billType === 'PHARMACY') return s.masterType === 'medicine' || s.category === 'Pharmacy' || s.type === 'medicine';
                      return true; // Show everything for IPD/Other
                    }).map((s: any) => (
                      <option key={`${s.masterType}-${s.id}`} value={s.id}>{s.name} - ₹{s.price}</option>
                    ))}
                  </select>
               </div>
               
               <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#64748b' }}>DESCRIPTION</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#64748b' }}>PRICE</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#64748b' }}>QTY</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#64748b' }}>DISCOUNT</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#64748b', textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.description}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tax: {item.tax}%</div>
                        </td>
                        <td style={{ padding: '16px 0', fontWeight: 600 }}>₹{item.price}</td>
                        <td style={{ padding: '16px 0' }}>
                          <input 
                            type="number" min="1" 
                            style={{ width: '50px', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].quantity = Number(e.target.value);
                              setItems(newItems);
                            }}
                          />
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <input 
                            type="number" min="0" 
                            placeholder="Amt"
                            style={{ width: '60px', padding: '4px', borderRadius: '6px', border: item.is_discountable ? '1px solid #10b981' : '1px solid #e2e8f0', color: '#166534', fontWeight: 700 }}
                            value={item.discount_amount}
                            disabled={item.is_discountable === false}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].discount_amount = Number(e.target.value);
                              setItems(newItems);
                            }}
                          />
                        </td>
                        <td style={{ padding: '16px 0', fontWeight: 800, textAlign: 'right' }}>
                          ₹{(item.price * item.quantity - (item.discount_amount || 0)).toFixed(2)}
                          <button onClick={() => removeItem(idx)} style={{ marginLeft: '12px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>

               <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '12px' }}>Payment Mode</label>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    {['Cash', 'UPI', 'Card', 'Insurance'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0',
                          background: paymentMode === mode ? '#0d9488' : 'white',
                          color: paymentMode === mode ? 'white' : '#64748b',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                 </div>
                 
                 {paymentMode === 'Insurance' && (
                   <div style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Insurance / TPA Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Select Provider / TPA</label>
                          <select 
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                          >
                            <option value="">-- Select TPA --</option>
                            {insuranceProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Policy / Card Number</label>
                          <input 
                            placeholder="e.g. POL-99234"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                            value={insuranceDetails.policyNumber}
                            onChange={(e) => setInsuranceDetails({...insuranceDetails, policyNumber: e.target.value})}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Insurer ID (Family/Indiv)</label>
                          <input 
                            placeholder="e.g. CID-8821"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                            value={insuranceDetails.insurerId}
                            onChange={(e) => setInsuranceDetails({...insuranceDetails, insurerId: e.target.value})}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Claim Type</label>
                          <select 
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                            value={insuranceDetails.claimType}
                            onChange={(e) => setInsuranceDetails({...insuranceDetails, claimType: e.target.value})}
                          >
                            <option value="Cashless">Cashless</option>
                            <option value="Co-pay">Co-pay</option>
                            <option value="Corporate">Corporate</option>
                            <option value="Government">Government</option>
                            <option value="Employee Plan">Employee Plan</option>
                          </select>
                        </div>
                      </div>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <aside>
             <div style={{ background: '#0f172a', padding: '32px', borderRadius: '28px', color: 'white', position: 'sticky', top: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                   <Icons.Wallet />
                   <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Payment Summary</h3>
                </div>

                 <style>{`
                   @media print {
                     .sidebar, .main-header, button, select, .no-print { display: none !important; }
                     .main-content { margin-left: 0 !important; padding: 0 !important; }
                     .manage-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
                     .dashboard-layout { display: block !important; }
                     body { background: white !important; }
                     .print-header { display: flex !important; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; }
                   }
                   .print-header { display: none; }
                 `}</style>

                 <div className="print-header">
                    <div>
                      <h1 style={{ margin: 0, fontWeight: 900 }}>INVOICE</h1>
                      <p style={{ color: '#64748b', margin: '4px 0' }}>{localStorage.getItem("tenantName") || "Healthezee Hospital"}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, margin: 0 }}>Date: {new Date().toLocaleDateString()}</p>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>Patient: {state?.patientName || "Walk-in"}</p>
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ color: '#94a3b8', fontSize: '14px' }}>Subtotal</span>
                       <span style={{ fontWeight: 700 }}>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ color: '#94a3b8', fontSize: '14px' }}>Tax Total</span>
                       <span style={{ fontWeight: 700 }}>₹{calculateTax().toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ fontWeight: 700, fontSize: '18px' }}>Net Payable</span>
                       <span style={{ fontWeight: 900, fontSize: '24px', color: '#10b981' }}>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                 </div>

                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => window.print()}
                      style={{
                        flex: 1, padding: '16px', borderRadius: '16px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      PRINT INVOICE
                    </button>
                    <button
                      onClick={processBilling}
                      disabled={loading || calculateTotal() <= 0}
                      style={{
                        flex: 1.5,
                        padding: '16px',
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
                      {loading ? 'PROCESSING...' : 'SAVE & FINALIZE'}
                    </button>
                 </div>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
