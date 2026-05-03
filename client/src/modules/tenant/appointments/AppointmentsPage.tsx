import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ patient_id: '', doctor_id: '', time: '', status: 'Scheduled' });

  const fetchAppointments = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const [apptRes, docRes, patRes] = await Promise.all([
        axios.get(`${API_BASE}/api/appointments`, { headers }),
        axios.get(`${API_BASE}/api/hospital/staff`, { headers }),
        axios.get(`${API_BASE}/api/patients?limit=50`, { headers })
      ]);
      setAppointments(apptRes.data);
      setDoctors(docRes.data.filter((s: any) => s.role === 'doctor'));
      setPatients(patRes.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchAppointments(); 
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      await axios.post(`${API_BASE}/api/appointments`, bookingForm, { headers });
      setShowBookModal(false);
      fetchAppointments();
      alert("Appointment confirmed!");
    } catch (err) { alert("Booking failed"); }
  };

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
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
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
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#3b82f6' }}>
                      {new Date(appt.time).getDate()} {new Date(appt.time).toLocaleString('en-US', { month: 'short' })}
                    </div>
                    <div style={{ marginLeft: '16px', flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#1e293b' }}>{appt.patient_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned to Dr. {appt.doctor_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>{new Date(appt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', marginTop: '4px' }}>{appt.status}</div>
                    </div>
                  </div>
                ))}
                {!loading && appointments.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8' }}>No appointments scheduled.</p>}
              </div>
            </div>
          </div>

          <aside>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Medical Staff</h3>
              {doctors.map((doc: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0f9ff', border: '2px solid #3b82f6', overflow: 'hidden' }}>
                    <img src={`https://ui-avatars.com/api/?name=${doc.name}&background=random`} alt="Doc" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ marginLeft: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Dr. {doc.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Consulting Now</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {showBookModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Book New Appointment</h2>
                <button onClick={() => setShowBookModal(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleBook}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Select Patient</label>
                  <select required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: 600 }}
                    onChange={e => setBookingForm({...bookingForm, patient_id: e.target.value})}
                  >
                    <option value="">Select from records...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Assign Doctor</label>
                  <select required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: 600 }}
                    onChange={e => setBookingForm({...bookingForm, doctor_id: e.target.value})}
                  >
                    <option value="">Select Doctor...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Date & Time</label>
                  <input type="datetime-local" required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: 700 }}
                    onChange={e => setBookingForm({...bookingForm, time: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowBookModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '16px', borderRadius: '16px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900 }}>Confirm Appointment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
