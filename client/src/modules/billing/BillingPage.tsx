import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Wallet, 
  ShieldCheck, 
  Receipt, 
  Search, 
  Plus, 
  Trash2, 
  Printer, 
  CreditCard, 
  Smartphone, 
  Banknote,
  Stethoscope,
  FlaskConical,
  Pill,
  Bed,
  ArrowRight,
  TrendingUp,
  History
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { API_BASE_URL as API_BASE } from "../../config/api";

type BillType = 'OPD' | 'LAB' | 'PHARMACY' | 'IPD' | 'DISCHARGE';

interface BillingTab {
  id: BillType;
  label: string;
  icon: any;
  color: string;
}

const BILLING_TABS: BillingTab[] = [
  { id: 'OPD', label: 'Consultation', icon: Stethoscope, color: '#4f46e5' },
  { id: 'PHARMACY', label: 'Pharmacy', icon: Pill, color: '#10b981' },
  { id: 'LAB', label: 'Laboratory / Diagnostics', icon: FlaskConical, color: '#f59e0b' },
  { id: 'DISCHARGE', label: 'Discharge / IPD', icon: Bed, color: '#ef4444' },
];

export default function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;
  const queryParams = new URLSearchParams(location.search);
  const initialType = (queryParams.get('type') as BillType) || state?.billType || 'OPD';

  const [activeTab, setActiveTab] = useState<BillType>(initialType);
  const [loading, setLoading] = useState(false);
  
  // Patient Context
  const [patient, setPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Master Data & Billing Items
  const [services, setServices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ dailyCollection: 0, pendingInsurance: 0, invoiceCount: 0 });
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  
  // Payment State
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [selectedProvider, setSelectedProvider] = useState("");
  const [insuranceDetails, setInsuranceDetails] = useState({
    policyNumber: "",
    insurerId: "",
    claimType: "Cashless",
    claimNumber: ""
  });

  const headers = { 
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  // 1. Initial Data Fetch & Patient Resolution
  useEffect(() => {
    fetchMasters();
    fetchStats();
    resolvePatientContext();
  }, []);

  const resolvePatientContext = async () => {
    // Priority 1: Full patient object in state
    if (state?.patient) {
      setPatient(state.patient);
      return;
    }
    // Priority 2: patientId or mrn in state/params
    const pId = state?.patientId || queryParams.get('patientId');
    const mrn = state?.mrn || queryParams.get('mrn');
    
    if (pId || mrn) {
      try {
        const search = pId || mrn;
        const res = await axios.get(`${API_BASE}/api/patients?search=${search}`, { headers });
        if (res.data.length > 0) setPatient(res.data[0]);
      } catch (err) { console.error("Failed to resolve patient context", err); }
    }
  };

  useEffect(() => {
    if (patient?.id) fetchPatientQueue();
    else setItems([]);
  }, [patient, activeTab]);

  const fetchMasters = async () => {
    try {
      const [srvRes, diagRes, treatRes, medRes, provRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/masters/services`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/diagnostics`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/treatments`, { headers }),
        axios.get(`${API_BASE}/api/hospital/masters/medicines`, { headers }),
        axios.get(`${API_BASE}/api/insurance/providers`, { headers })
      ]);
      
      setServices([
        ...srvRes.data.map((s: any) => ({ ...s, masterType: 'service', compositeId: `srv-${s.id}` })),
        ...diagRes.data.map((s: any) => ({ ...s, masterType: 'diagnostic', compositeId: `diag-${s.id}` })),
        ...treatRes.data.map((s: any) => ({ ...s, masterType: 'treatment', compositeId: `treat-${s.id}` })),
        ...medRes.data.map((s: any) => ({ ...s, masterType: 'medicine', compositeId: `med-${s.id}` }))
      ]);
      setInsuranceProviders(provRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/metrics/stats`, { headers });
      setStats({
        dailyCollection: res.data.metrics?.dailyCollection || 0,
        pendingInsurance: res.data.metrics?.pendingInsurance || 0,
        invoiceCount: res.data.metrics?.todayInvoices || 0
      });
    } catch (err) { console.error(err); }
  };

  const fetchPatientQueue = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/billing/queue/${patient.id}`, { headers });
      const filtered = res.data.filter((item: any) => {
        const mod = item.source_module?.toUpperCase();
        if (activeTab === 'OPD') return mod === 'CONSULTATION' || mod === 'REGISTRATION';
        if (activeTab === 'PHARMACY') return mod === 'PHARMACY';
        if (activeTab === 'LAB') return mod === 'LAB' || mod === 'DIAGNOSTIC';
        return true; // All for Discharge
      });

      setItems(filtered.map((item: any) => ({
        ...item,
        description: item.description || item.name,
        price: Number(item.unit_price || item.price || 0),
        quantity: Number(item.quantity || 1),
        tax: Number(item.tax_percent || 0),
        discount: 0
      })));
    } catch (err) { console.error(err); }
  };

  const handlePatientSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/patients?search=${val}`, { headers });
      setSearchResults(res.data);
    } catch (err) { console.error(err); }
  };

  const addItem = (srv: any) => {
    setItems([...items, { 
      description: srv.name, 
      price: Number(srv.price), 
      quantity: 1, 
      tax: Number(srv.tax_percent || 0),
      discount: 0
    }]);
  };

  const addManualItem = () => {
    const desc = prompt("Enter Item Description:", "Miscellaneous Item");
    const price = prompt("Enter Unit Price:", "0");
    if (desc && price) {
      setItems([...items, { 
        description: desc, 
        price: Number(price), 
        quantity: 1, 
        tax: 0,
        discount: 0
      }]);
    }
  };

  const setWalkInPatient = () => {
    setPatient({
      id: "WALK-IN",
      name: "Walk-in Customer",
      mrn: "GENERAL",
      gender: "N/A",
      age: "--"
    });
  };

  const totals = {
    subtotal: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    tax: items.reduce((acc, item) => acc + (item.price * item.quantity * (item.tax / 100)), 0),
    discount: items.reduce((acc, item) => acc + (item.discount || 0), 0),
    get net() { return this.subtotal + this.tax - this.discount }
  };

  const finalizeBilling = async () => {
    if (!patient) return alert("Select patient first");
    setLoading(true);
    try {
      const billRes = await axios.post(`${API_BASE}/api/billing`, {
        patientId: patient.id,
        billType: activeTab,
        items,
        totalAmount: totals.net,
        paymentMode,
        status: paymentMode === 'Insurance' ? 'PENDING_SETTLEMENT' : 'PAID'
      }, { headers });

      if (paymentMode === 'Insurance' && selectedProvider) {
        await axios.post(`${API_BASE}/api/insurance/claims`, {
          patientId: patient.id,
          invoiceId: billRes.data.id,
          providerId: selectedProvider,
          ...insuranceDetails,
          billedAmount: totals.net,
          status: 'PRE-AUTH PENDING'
        }, { headers });
      }

      alert("Billing Processed Successfully!");
      navigate("/tenant/dashboard");
    } catch (err) {
      console.error(err);
      alert("Error processing bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout" style={{ background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Header title="Consolidated Billing & Revenue Center" />

        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* TOP STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            {[
              { label: 'Today\'s Collection', value: totals.net.toLocaleString(), icon: TrendingUp, color: '#10b981', sub: `${stats.invoiceCount} Invoices` },
              { label: 'Insurance Pending', value: stats.pendingInsurance.toLocaleString(), icon: ShieldCheck, color: '#3b82f6', sub: 'Awaiting Settlement' },
              { label: 'Outstanding Dues', value: '45,200', icon: History, color: '#f59e0b', sub: 'Past 30 Days' }
            ].map((s, i) => (
              <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${s.color}10`, color: s.color, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={28} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>₹ {s.value}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CONTEXT TABS */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', padding: '6px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
            {BILLING_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: isActive ? tab.color : 'transparent',
                    color: isActive ? 'white' : '#64748b',
                    fontWeight: 700, fontSize: '14px'
                  }}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'start' }}>
            
            {/* LEFT: PATIENT & ITEMS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* PATIENT SEARCH */}
              <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={18} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Patient Identity Lookup</h3>
                </div>

                {!patient ? (
                  <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        placeholder="Search by MRN, Name or Phone..."
                        value={searchQuery}
                        onChange={(e) => handlePatientSearch(e.target.value)}
                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '15px', fontWeight: 600, outline: 'none', background: '#f8fafc' }}
                      />
                      {searchResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', marginTop: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                          {searchResults.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => { setPatient(p); setSearchResults([]); }}
                              style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>{p.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>MRN: {p.mrn} • {p.phone}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={setWalkInPatient}
                      style={{ padding: '0 24px', borderRadius: '16px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700, cursor: 'pointer' }}
                    >
                      WALK-IN
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>
                      {patient.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#166534' }}>{patient.name}</div>
                      <div style={{ fontSize: '13px', color: '#166534', opacity: 0.8 }}>MRN: {patient.mrn} • {patient.gender} • {patient.age}Y</div>
                    </div>
                    <button 
                      onClick={() => setPatient(null)}
                      style={{ padding: '8px 16px', borderRadius: '10px', background: 'white', border: '1px solid #bbf7d0', color: '#ef4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      CHANGE
                    </button>
                  </div>
                )}
              </div>

              {/* BILLING ITEMS */}
              <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Receipt size={18} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Invoice Particulars</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                    <select 
                      style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 600, background: '#f8fafc', maxWidth: '250px' }}
                      onChange={(e) => {
                        const srv = services.find(s => s.compositeId === e.target.value);
                        if (srv) addItem(srv);
                        e.target.value = ""; // Reset
                      }}
                    >
                      <option value="">+ Add Service / Medicine</option>
                      {services.filter(s => {
                        if (activeTab === 'OPD') return s.category === 'Consultation' || s.masterType === 'service';
                        if (activeTab === 'PHARMACY') return s.masterType === 'medicine';
                        if (activeTab === 'LAB') return s.masterType === 'diagnostic';
                        return true;
                      }).map(s => <option key={s.compositeId} value={s.compositeId}>{s.name} (₹{s.price})</option>)}
                    </select>
                    <button 
                      onClick={addManualItem}
                      style={{ padding: '10px 16px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      + MANUAL ITEM
                    </button>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>DESCRIPTION</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>UNIT PRICE</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>QTY</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', fontWeight: 800, textAlign: 'right' }}>TOTAL (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{item.description}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>TAX: {item.tax}% • {item.source_module || 'MANUAL'}</div>
                        </td>
                        <td style={{ padding: '20px 16px', fontWeight: 600, color: '#475569' }}>₹ {item.price.toLocaleString()}</td>
                        <td style={{ padding: '20px 16px' }}>
                          <input 
                            type="number" min="1" 
                            style={{ width: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx].quantity = Number(e.target.value);
                              setItems(next);
                            }}
                          />
                        </td>
                        <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{(item.price * item.quantity).toLocaleString()}</span>
                            <button 
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                          No items added to invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: SUMMARY & PAYMENT */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              <div style={{ background: '#0f172a', padding: '32px', borderRadius: '28px', color: 'white', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={18} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Payment Summary</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Invoice Subtotal</span>
                    <span style={{ fontWeight: 700 }}>₹ {totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Taxes & Levies</span>
                    <span style={{ fontWeight: 700 }}>₹ {totals.tax.toLocaleString()}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Net Payable Amount</div>
                      <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981' }}>₹ {totals.net.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* PAYMENT MODES */}
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '16px' }}>Select Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'Cash', icon: Banknote },
                      { id: 'UPI', icon: Smartphone },
                      { id: 'Card', icon: CreditCard },
                      { id: 'Insurance', icon: ShieldCheck }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setPaymentMode(mode.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '16px',
                          border: paymentMode === mode.id ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                          background: paymentMode === mode.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          color: paymentMode === mode.id ? '#10b981' : '#94a3b8',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        <mode.icon size={16} />
                        {mode.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    disabled={loading || totals.net <= 0}
                    onClick={finalizeBilling}
                    style={{ 
                      width: '100%', padding: '18px', borderRadius: '16px', background: '#10b981', color: 'white', 
                      border: 'none', fontWeight: 900, fontSize: '16px', cursor: 'pointer',
                      boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    {loading ? 'PROCESSING...' : 'GENERATE INVOICE'}
                  </button>
                  <button 
                    onClick={() => window.print()}
                    style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Printer size={16} />
                    PRINT PROFORMA
                  </button>
                </div>
              </div>

              {/* INSURANCE CARD (Contextual) */}
              {paymentMode === 'Insurance' && (
                <div style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 800 }}>TPA / Claim Context</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>INSURANCE PROVIDER</label>
                      <select 
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                      >
                        <option value="">-- Select Provider --</option>
                        {insuranceProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>POLICY NUMBER</label>
                      <input 
                        value={insuranceDetails.policyNumber}
                        onChange={(e) => setInsuranceDetails({...insuranceDetails, policyNumber: e.target.value})}
                        placeholder="e.g. POL-123456"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
