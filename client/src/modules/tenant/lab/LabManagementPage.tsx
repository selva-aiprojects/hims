import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function LabManagementPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [resultText, setResultText] = useState("");
  
  // External Lab AI States
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [labFile, setLabFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fetchOrders = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/lab/orders`, { headers });
      setOrders(res.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchOrders(); 
  }, []);

  const saveResult = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.put(`${API_BASE}/api/hospital/lab/orders/${activeOrder.id}`, { result_data: resultText }, { headers });
      alert("Results recorded successfully!");
      setActiveOrder(null);
      setResultText("");
      fetchOrders();
      if (confirm("Would you like to process billing for this test now?")) {
        navigate('/billing', { state: { billType: 'LAB', totalAmount: 85.00 } });
      }
    } catch (err) { 
      alert("Failed to save result"); 
    }
  };

  const searchPatient = async () => {
    if (!searchTerm) return;
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/patients?search=${searchTerm}`, { headers });
      setPatients(res.data);
    } catch (err) { console.error(err); }
  };

  const handleExternalScan = async () => {
    if (!selectedPatientId || !labFile) return alert("Select patient and file");
    setIsScanning(true);
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const formData = new FormData();
      formData.append("patientId", selectedPatientId);
      formData.append("lab_report", labFile);

      const res = await axios.post(`${API_BASE}/api/hospital/lab/upload-external`, formData, { headers });
      alert(`AI Extraction Complete!\n\n${res.data.noteText}`);
      setLabFile(null);
      setSelectedPatientId("");
      setSearchTerm("");
      setPatients([]);
    } catch (err) {
      alert("Failed to parse external lab report");
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Laboratory Diagnostics Desk" />

        <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
          {/* External Lab AI Scan */}
          <div className="manage-card" style={{ flex: 1, background: '#fdf4ff', padding: '24px', borderRadius: '24px', border: '1px solid #fae8ff' }}>
            <h3 style={{ margin: '0 0 16px', color: '#86198f', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>✨</span> AI External Report Scan
            </h3>
            <p style={{ fontSize: '13px', color: '#a21caf', marginBottom: '16px' }}>Upload external patient lab reports (PDF/Image). AI will extract values and update patient's clinical summary.</p>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input placeholder="Search Patient by MRN/Name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #f5d0fe' }} />
              <button onClick={searchPatient} style={{ padding: '0 20px', background: '#d946ef', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Search</button>
            </div>
            
            {patients.length > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '16px', background: 'white', borderRadius: '12px', padding: '8px' }}>
                {patients.map(p => (
                  <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ padding: '10px', borderRadius: '8px', background: selectedPatientId === p.id ? '#fdf4ff' : 'white', cursor: 'pointer', border: `1px solid ${selectedPatientId === p.id ? '#d946ef' : 'transparent'}` }}>
                    <strong>{p.name}</strong> <span style={{ fontSize: '12px', color: '#64748b' }}>({p.mrn})</span>
                  </div>
                ))}
              </div>
            )}

            {selectedPatientId && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="file" accept=".pdf,image/*" onChange={e => setLabFile(e.target.files?.[0] || null)} style={{ flex: 1, padding: '8px', background: 'white', borderRadius: '12px' }} />
                <button onClick={handleExternalScan} disabled={!labFile || isScanning} style={{ padding: '0 20px', background: '#86198f', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: isScanning ? 'not-allowed' : 'pointer', opacity: isScanning ? 0.7 : 1 }}>
                  {isScanning ? 'Scanning...' : 'Upload & Parse'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeOrder ? '1fr 450px' : '1fr', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="manage-card" style={{ background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Diagnostic Queue</h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Manage pending clinical investigations</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#059669', padding: '6px 16px', borderRadius: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                    {orders.length} ACTIVE
                  </span>
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient / MRN</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investigation</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                        <td style={{ padding: '20px 32px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{o.patient_name}</div>
                          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{o.mrn || 'WALK-IN'}</div>
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{o.test_name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ref: #{o.id.substring(0,8)}</div>
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 900, 
                            color: '#d97706', 
                            background: '#fffbeb', 
                            padding: '4px 10px', 
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                          <button 
                            onClick={() => setActiveOrder(o)}
                            style={{ 
                              padding: '10px 20px', 
                              background: '#3b82f6', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '12px', 
                              fontWeight: 800, 
                              fontSize: '13px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            Process Results
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} style={{ padding: '100px 0', textAlign: 'center' }}>
                          <div style={{ opacity: 0.3, marginBottom: '16px' }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 3h12l-2 6H8l-2-6zM8 9v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9"/></svg>
                          </div>
                          <div style={{ color: '#94a3b8', fontWeight: 600 }}>No pending investigations in queue</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {activeOrder && (
            <aside style={{ position: 'sticky', top: '32px', background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Clinical Findings</h3>
                <button 
                  onClick={() => setActiveOrder(null)} 
                  style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Active Investigation</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{activeOrder.test_name}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Patient: <span style={{ fontWeight: 700 }}>{activeOrder.patient_name}</span></div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#475569', marginBottom: '12px' }}>Observation Parameters</label>
                <textarea 
                  placeholder="Enter detailed clinical findings, measurements, and technical observations..."
                  style={{ 
                    width: '100%', 
                    height: '280px', 
                    padding: '20px', 
                    borderRadius: '24px', 
                    border: '1px solid #e2e8f0', 
                    outline: 'none', 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    background: '#fcfcfc',
                    transition: 'border-color 0.2s'
                  }}
                  value={resultText} onChange={e => setResultText(e.target.value)}
                />
              </div>

              <button 
                onClick={saveResult}
                style={{ 
                  width: '100%', 
                  padding: '20px', 
                  borderRadius: '20px', 
                  background: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  fontWeight: 900, 
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                }}
              >
                Validate & Authorize Report
              </button>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
