import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function IPDPatientView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ admission: any; notes: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Progress");
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/ipd/admissions/${id}`, { headers });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/hospital/ipd/admissions/${id}/notes`, {
        noteText, noteType
      }, { headers });
      setNoteText("");
      fetchData();
    } catch (err) { alert("Failed to save note"); }
  };

  const handleDischarge = async () => {
    try {
      const res = await axios.put(`${API_BASE}/api/hospital/ipd/admissions/${id}/discharge`, {}, { headers });
      const bill = res.data.billingSummary;
      setShowDischargeConfirm(false);
      if (confirm(`Patient discharged!\n\n${bill.daysAdmitted} days × ₹${bill.dailyCharge} = ₹${bill.bedCharges} bed charges.\n\nProceed to generate the final IPD bill?`)) {
        navigate('/billing', {
          state: {
            billType: 'IPD',
            totalAmount: bill.bedCharges,
            patientName: bill.patientName,
            encounterId: bill.encounterId
          }
        });
      } else {
        navigate('/tenant/ipd/admissions');
      }
    } catch (err) { alert("Discharge failed"); }
  };

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await axios.post(`${API_BASE}/api/hospital/ipd/admissions/${id}/generate-summary`, {}, { headers });
      alert(`AI Discharge Summary Generated Successfully!\nPDF saved at: ${res.data.pdfPath}`);
      fetchData(); // Refresh the notes
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI Discharge Summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (loading) return (
    <div className="dashboard-layout" style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading patient record...</main>
    </div>
  );

  const adm = data?.admission;
  const notes = data?.notes || [];
  const los = adm ? Math.ceil((Date.now() - new Date(adm.admitted_at).getTime()) / (1000 * 60 * 60 * 24)) || 1 : 0;

  const NOTE_COLORS: Record<string, string> = {
    Progress: '#3b82f6',
    Nursing: '#10b981',
    'Discharge Summary': '#8b5cf6'
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <Header title="IPD Patient Record" />

        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/tenant/ipd/admissions')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
            ← Back to Census
          </button>
          <button
            onClick={() => setShowDischargeConfirm(true)}
            style={{ padding: '12px 28px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', fontSize: '14px', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }}
          >
            🚪 Discharge Patient
          </button>
        </div>

        {adm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px' }}>
            {/* Left: Patient Info + Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Patient Header */}
              <div style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                    🏥
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>{adm.patient_name}</h2>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
                      <span style={{ color: '#3b82f6', fontWeight: 800 }}>{adm.mrn}</span> · {adm.age} yrs · {adm.gender} · {adm.phone}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 900, fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                      ACTIVE ADMISSION
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '28px' }}>
                  {[
                    { label: 'Ward', value: adm.ward_name },
                    { label: 'Bed', value: adm.bed_number },
                    { label: 'Length of Stay', value: `${los} day${los !== 1 ? 's' : ''}` },
                    { label: 'Treating Doctor', value: adm.doctor_name || 'Not assigned' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ margin: '6px 0 0', fontWeight: 900, color: '#0f172a', fontSize: '15px' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px', padding: '16px 20px', background: '#fffbeb', borderRadius: '14px', border: '1px solid #fcd34d' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#92400e' }}>ADMISSION REASON</p>
                  <p style={{ margin: '6px 0 0', color: '#78350f', lineHeight: 1.6 }}>{adm.admission_reason}</p>
                </div>
              </div>

              {/* Clinical Notes */}
              <div style={{ background: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>Clinical Notes & Progress</h3>

                {/* Add Note */}
                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {['Progress', 'Nursing', 'Discharge Summary'].map(t => (
                      <button key={t} onClick={() => setNoteType(t)} style={{
                        padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                        background: noteType === t ? NOTE_COLORS[t] : '#e2e8f0',
                        color: noteType === t ? 'white' : '#64748b'
                      }}>{t}</button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Document clinical observations, vital trends, doctor's orders, nursing notes..."
                    rows={4}
                    style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', resize: 'none', fontSize: '14px', lineHeight: 1.6 }}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <button onClick={addNote} style={{ marginTop: '12px', padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                    + Add Note
                  </button>
                </div>

                {/* Notes Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {notes.map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: NOTE_COLORS[n.note_type] || '#94a3b8', flexShrink: 0 }}></div>
                        {i < notes.length - 1 && <div style={{ width: '2px', flex: 1, background: '#f1f5f9', marginTop: '4px' }}></div>}
                      </div>
                      <div style={{ flex: 1, paddingBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: NOTE_COLORS[n.note_type] || '#64748b', background: `${NOTE_COLORS[n.note_type]}20`, padding: '2px 10px', borderRadius: '6px' }}>
                            {n.note_type}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(n.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {n.doctor_name || 'Staff'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{n.note_text}</p>
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No notes yet. Add the first progress note above.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Billing Summary */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '32px' }}>
              <div style={{ background: '#0f172a', padding: '28px', borderRadius: '28px', color: 'white' }}>
                <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 800 }}>💰 Billing Estimate</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Daily Charge</span>
                    <span style={{ fontWeight: 700 }}>₹{Number(adm.daily_charge).toFixed(0)}/day</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Length of Stay</span>
                    <span style={{ fontWeight: 700 }}>{los} day{los !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>Bed Charges</span>
                    <span style={{ fontWeight: 900, fontSize: '22px', color: '#10b981' }}>₹{(los * Number(adm.daily_charge)).toFixed(0)}</span>
                  </div>
                </div>
                <p style={{ color: '#475569', fontSize: '12px', margin: '0 0 16px' }}>+ Lab, Pharmacy & clinical charges to be added at discharge</p>
                <button
                  onClick={() => navigate('/billing', { state: { billType: 'IPD', totalAmount: los * Number(adm.daily_charge), patientName: adm.patient_name, encounterId: adm.encounter_id } })}
                  style={{ width: '100%', padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}
                >
                  View Detailed Bill
                </button>
              </div>

              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px', fontWeight: 800 }}>Quick Actions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => navigate('/tenant/lab')} style={{ padding: '12px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>🔬 Order Lab Test</button>
                  <button onClick={() => navigate('/tenant/pharmacy/queue')} style={{ padding: '12px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>💊 Pharmacy Order</button>
                  <button onClick={generateAISummary} disabled={isGeneratingSummary} style={{ padding: '12px', background: '#fdf4ff', color: '#86198f', border: '1px solid #fae8ff', borderRadius: '12px', fontWeight: 700, cursor: isGeneratingSummary ? 'not-allowed' : 'pointer', opacity: isGeneratingSummary ? 0.7 : 1 }}>✨ {isGeneratingSummary ? 'Generating AI Summary...' : 'Generate AI Discharge Summary'}</button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Discharge Confirm Modal */}
        {showDischargeConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '28px', maxWidth: '440px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
              <h2 style={{ fontWeight: 900, marginBottom: '12px' }}>Confirm Discharge</h2>
              <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
                This will discharge <strong>{adm?.patient_name}</strong>, free the bed, and calculate the final bill. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowDischargeConfirm(false)} style={{ flex: 1, padding: '14px', border: '1px solid #e2e8f0', borderRadius: '14px', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDischarge} style={{ flex: 1, padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}>Discharge</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
