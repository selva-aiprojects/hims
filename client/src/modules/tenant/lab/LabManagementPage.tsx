import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";

const STATUS_FLOW = [
  { id: 'Pending', label: 'Order Received', color: '#64748b', bg: '#f1f5f9' },
  { id: 'Sample Collected', label: 'Sample Collected', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'In Progress', label: 'Analysis In-Progress', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'Completed', label: 'Result Authorized', color: '#10b981', bg: '#ecfdf5' }
];

export default function LabManagementPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'in_progress' | 'to_publish' | 'archive'>('queue');
  
  // Results form
  const [testResults, setTestResults] = useState<{ param: string, value: string, unit: string }[]>([
    { param: '', value: '', unit: '' }
  ]);
  const [technicianNote, setTechnicianNote] = useState("");

  const fetchOrders = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/lab/orders`, { headers });
      setOrders(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: string) => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.put(`${API_BASE}/api/hospital/lab/orders/${orderId}/status`, { status }, { headers });
      fetchOrders();
      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder({ ...activeOrder, status });
      }
    } catch (err) { alert("Failed to update status"); }
  };

  const submitResults = async () => {
    if (testResults.some(r => !r.param || !r.value)) return alert("Please fill all test parameters");
    
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.post(`${API_BASE}/api/hospital/lab/orders/${activeOrder.id}/results`, { 
        results: testResults,
        technicianNote 
      }, { headers });
      
      alert("Results recorded and authorized!");
      const completedOrder = { ...activeOrder };
      setActiveOrder(null);
      setTestResults([{ param: '', value: '', unit: '' }]);
      setTechnicianNote("");
      fetchOrders();

      if (window.confirm("Results saved. Would you like to generate a bill for this investigation now?")) {
        navigate('/billing', { state: { 
          billType: 'LAB', 
          totalAmount: Number(completedOrder.price || 0),
          patientName: completedOrder.patient_name,
          patientId: completedOrder.patient_id,
          encounterId: completedOrder.encounter_id,
          labOrderId: completedOrder.id
        } });
      }
    } catch (err) { alert("Failed to submit results"); }
  };

  const publishReport = async (orderId: string) => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.post(`${API_BASE}/api/hospital/lab/orders/${orderId}/publish`, {}, { headers });
      alert("Report published successfully!");
      fetchOrders();
    } catch (err) { alert("Failed to publish report"); }
  };

  const filteredOrders = orders.filter(o => {
    const status = (o.status || 'Pending').toLowerCase();
    if (activeTab === 'queue') return status === 'pending';
    if (activeTab === 'in_progress') return status === 'sample collected' || status === 'in progress';
    if (activeTab === 'to_publish') return status === 'completed';
    if (activeTab === 'archive') return status === 'published';
    return false;
  });

  const stats = {
    urgent: orders.filter(o => o.priority === 'Urgent' && (o.status || 'Pending').toLowerCase() !== 'published').length,
    pending: orders.filter(o => (o.status || 'Pending').toLowerCase() === 'pending').length,
    active: orders.filter(o => ['sample collected', 'in progress'].includes((o.status || '').toLowerCase())).length,
    toPublish: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Diagnostics Command Center" />

        <div style={{ display: 'grid', gridTemplateColumns: activeOrder ? '1fr 500px' : '1fr', gap: '32px' }}>
          <div>
            {/* Real-time Stats Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
               <div className="stat-card" style={{ background: stats.urgent > 0 ? '#fee2e2' : 'white', padding: '24px', borderRadius: '24px', border: `1px solid ${stats.urgent > 0 ? '#ef4444' : '#e2e8f0'}`, position: 'relative', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: stats.urgent > 0 ? '#b91c1c' : '#64748b', textTransform: 'uppercase' }}>Urgent Requests</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: stats.urgent > 0 ? '#ef4444' : '#0f172a' }}>{stats.urgent}</h3>
                  {stats.urgent > 0 && <div className="pulse" style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></div>}
               </div>
               <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Waiting (Pending)</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#3b82f6' }}>{stats.pending}</h3>
               </div>
               <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Processing</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#f59e0b' }}>{stats.active}</h3>
               </div>
               <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>To Be Published</p>
                  <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#10b981' }}>{stats.toPublish}</h3>
               </div>
            </div>

            {/* Workflow Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
               {[
                 { id: 'queue', label: 'Order Queue', count: stats.pending },
                 { id: 'in_progress', label: 'In-Progress', count: stats.active },
                 { id: 'to_publish', label: 'To Publish', count: stats.toPublish },
                 { id: 'archive', label: 'Archive', count: null }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => { setActiveTab(tab.id as any); setActiveOrder(null); }}
                   style={{ 
                     padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                     background: activeTab === tab.id ? 'white' : 'transparent',
                     color: activeTab === tab.id ? '#0f172a' : '#64748b',
                     boxShadow: activeTab === tab.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                     display: 'flex', alignItems: 'center', gap: '8px'
                   }}
                 >
                   {tab.label}
                   {tab.count !== null && <span style={{ fontSize: '11px', background: activeTab === tab.id ? '#eff6ff' : '#e2e8f0', color: activeTab === tab.id ? '#3b82f6' : '#64748b', padding: '2px 8px', borderRadius: '8px' }}>{tab.count}</span>}
                 </button>
               ))}
            </div>

            <div className="manage-card" style={{ background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Patient Details</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Investigation</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Priority/Status</th>
                      <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o: any, i: number) => {
                      const curStatus = (o.status || 'Pending').toLowerCase();
                      const statusCfg = STATUS_FLOW.find(s => s.id.toLowerCase() === curStatus) || STATUS_FLOW[0];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: activeOrder?.id === o.id ? '#f8fafc' : 'white' }}>
                          <td style={{ padding: '20px 32px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{o.patient_name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>MRN: {o.mrn || 'WALK-IN'}</div>
                          </td>
                          <td style={{ padding: '20px 32px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{o.test_name}</div>
                            <div style={{ fontSize: '11px', color: '#3b82f6' }}>Dr. {o.doctor_name || 'System'}</div>
                          </td>
                          <td style={{ padding: '20px 32px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {o.priority === 'Urgent' && (
                                   <span style={{ fontSize: '10px', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>⚡ URGENT</span>
                                )}
                                <span style={{ 
                                  fontSize: '11px', fontWeight: 900, color: statusCfg.color, background: statusCfg.bg, 
                                  padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content'
                                }}>
                                  {o.status?.toUpperCase() || 'PENDING'}
                                </span>
                             </div>
                          </td>
                          <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                             {curStatus === 'completed' ? (
                               <button 
                                 onClick={() => publishReport(o.id)}
                                 style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                               >
                                 PUBLISH REPORT
                               </button>
                             ) : curStatus === 'published' ? (
                               <button disabled style={{ padding: '10px 20px', background: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px' }}>PUBLISHED</button>
                             ) : (
                               <button 
                                 onClick={() => setActiveOrder(o)}
                                 style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                               >
                                 {curStatus === 'pending' ? 'START WORKFLOW' : 'MANAGE TEST'}
                               </button>
                             )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredOrders.length === 0 && !loading && (
                      <tr><td colSpan={4} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No orders found in this section.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>

          {/* Workflow Sidebar */}
          {activeOrder && (
            <aside style={{ background: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0', position: 'sticky', top: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 900 }}>Test Processing</h3>
                  <button onClick={() => setActiveOrder(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
               </div>

               <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>INVESTIGATION FOR</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{activeOrder.test_name}</div>
                  <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 800, marginTop: '4px' }}>{activeOrder.patient_name}</div>
               </div>

               <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Current Workflow Step</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {STATUS_FLOW.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => updateStatus(activeOrder.id, s.id)}
                        disabled={s.id === 'Completed'}
                        style={{ 
                          padding: '12px', borderRadius: '12px', border: (activeOrder.status || 'Pending').toLowerCase() === s.id.toLowerCase() ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          background: (activeOrder.status || 'Pending').toLowerCase() === s.id.toLowerCase() ? '#eff6ff' : 'white',
                          color: (activeOrder.status || 'Pending').toLowerCase() === s.id.toLowerCase() ? '#3b82f6' : '#64748b',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {(activeOrder.status || 'Pending').toLowerCase() === s.id.toLowerCase() && '✓ '}{s.label}
                      </button>
                    ))}
                  </div>
               </div>

               {(activeOrder.status || '').toLowerCase() !== 'pending' && (
                 <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '32px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 900 }}>Diagnostic Findings</h4>
                    {testResults.map((res, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '8px', marginBottom: '12px' }}>
                        <input placeholder="Parameter" value={res.param} onChange={e => {
                          const n = [...testResults]; n[idx].param = e.target.value; setTestResults(n);
                        }} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <input placeholder="Value" value={res.value} onChange={e => {
                          const n = [...testResults]; n[idx].value = e.target.value; setTestResults(n);
                        }} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <input placeholder="Unit" value={res.unit} onChange={e => {
                          const n = [...testResults]; n[idx].unit = e.target.value; setTestResults(n);
                        }} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                      </div>
                    ))}
                    <button onClick={addResultRow} style={{ padding: '8px 16px', border: 'none', background: 'none', color: '#3b82f6', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}>+ Add Parameter</button>
                    
                    <textarea 
                      placeholder="Clinical Technician Notes..."
                      style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '16px', height: '100px', fontSize: '13px' }}
                      value={technicianNote} onChange={e => setTechnicianNote(e.target.value)}
                    />

                    <button 
                      onClick={submitResults}
                      style={{ width: '100%', marginTop: '24px', padding: '16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '15px', cursor: 'pointer' }}
                    >
                      VALIDATE & AUTHORIZE
                    </button>
                 </div>
               )}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
