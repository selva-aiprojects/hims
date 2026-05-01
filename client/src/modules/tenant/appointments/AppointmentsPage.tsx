import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";

const API_BASE = "http://localhost:4000";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  const fetchAppointments = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/encounters`, { headers });
      setAppointments(res.data);
      
      const docRes = await axios.get(`${API_BASE}/api/hospital/staff`, { headers });
      setDoctors(docRes.data.filter((s: any) => s.role === 'doctor'));
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchAppointments(); 
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="welcome-msg">
            <h1>Patient Scheduling</h1>
            <p>Manage doctor calendars and patient appointments.</p>
          </div>
          <button 
            onClick={() => setShowBookModal(true)}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Book New Appointment
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
          <div>
            <div className="manage-card" style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Upcoming Appointments</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading appointments...</p>
                ) : appointments.map((appt: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: '#3b82f6' }}>
                      {i + 1}
                    </div>
                    <div style={{ marginLeft: '16px', flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#1e293b' }}>{appt.patient_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned to Dr. {appt.doctor_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>Today</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(appt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                {!loading && appointments.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8' }}>No appointments scheduled for today.</p>}
              </div>
            </div>
          </div>

          <aside>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Doctor Availability</h3>
              {doctors.map((doc: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0f9ff', border: '2px solid #3b82f6', overflow: 'hidden' }}>
                    <img src={`https://ui-avatars.com/api/?name=${doc.name}&background=random`} alt="Doc" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ marginLeft: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Dr. {doc.name}</div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>Available Now</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {showBookModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 800 }}>Book Appointment</h2>
              <form onSubmit={(e) => e.preventDefault()}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Patient Name</label>
                  <input required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Assign Doctor</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowBookModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Confirm Slot</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
