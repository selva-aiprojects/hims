import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { Calendar, Clock, User, Plus, X, CheckCircle, Users } from "lucide-react";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);
  const [bookingForm, setBookingForm] = useState({ 
    patient_id: '', 
    doctor_id: '', 
    appointment_time: '', 
    status: 'Scheduled' 
  });

  // Modal specific states for "Grid & Search"
  const [modalSearchPatient, setModalSearchPatient] = useState("");
  const [modalSelectedDate, setModalSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAppointments = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const [apptRes, docRes, patRes] = await Promise.all([
        axios.get(`${API_BASE}/api/appointments`, { headers }),
        axios.get(`${API_BASE}/api/hospital/doctors`, { headers }),
        axios.get(`${API_BASE}/api/patients?limit=100`, { headers })
      ]);
      setAppointments(apptRes.data || []);
      const allDocs = docRes.data || [];
      setDoctors(allDocs.filter((s: any) => !s.role || s.role.toLowerCase() === 'doctor'));
      setPatients(patRes.data || []);
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
      setBookingForm({ patient_id: '', doctor_id: '', appointment_time: '', status: 'Scheduled' });
      alert("Appointment confirmed!");
    } catch (err) { 
      console.error(err);
      alert("Booking failed. Please ensure all fields are selected correctly."); 
    }
  };

  const filteredAppointments = appointments
    .filter(appt => !selectedDoctorId || appt.doctor_id === selectedDoctorId)
    .filter(appt => activeCategory === "All" || appt.status === activeCategory)
    .filter(appt => {
      const query = searchTerm.toLowerCase();
      return (
        appt.patient_name?.toLowerCase().includes(query) ||
        appt.doctor_name?.toLowerCase().includes(query) ||
        appt.status?.toLowerCase().includes(query)
      );
    });

  const fetchDoctorAvailability = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/doctors/${doctorId}/availability-rules?startDate=${date}&endDate=${date}`, { headers });
      // Generate slots from 09:00 to 18:00
      const slots = [];
      const appointmentsOnDay = res.data.appointments || [];
      for (let h = 9; h < 18; h++) {
        for (let m = 0; m < 60; m += 30) {
          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const isBooked = appointmentsOnDay.some((a: any) => a.appointment_time.includes(time));
          slots.push({ time, isBooked });
        }
      }
      setDoctorSlots(slots);
    } catch (err) { console.error(err); }
    finally { setLoadingSlots(false); }
  };

  useEffect(() => {
    if (showBookModal && bookingForm.doctor_id && modalSelectedDate) {
      fetchDoctorAvailability(bookingForm.doctor_id, modalSelectedDate);
    }
  }, [bookingForm.doctor_id, modalSelectedDate, showBookModal]);

  const inputStyle = { 
    width: '100%', 
    padding: '14px', 
    borderRadius: '14px', 
    border: '1px solid #e2e8f0', 
    outline: 'none', 
    fontSize: '14px', 
    fontWeight: 600,
    background: '#f8fafc'
  };

  return (
    <div className="dashboard-layout" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: '32px' }}>
        <Header title="Patient Scheduling" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', marginTop: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: 0 }}>Appointments Management</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Check doctor availability and book patient appointments.</p>
          </div>
          <button 
            onClick={() => setShowBookModal(true)}
            className="button-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '14px 28px', 
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={20} />
            Book New Appointment
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '24px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              display: 'flex',
              overflow: 'hidden'
            }}>
              {/* Vertical Category Panel */}
              <div style={{ 
                width: '200px', 
                background: '#f8fafc', 
                borderRight: '1px solid #e2e8f0',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '12px' }}>Categories</div>
                {["All", "Scheduled", "Completed", "Cancelled"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: activeCategory === cat ? '#3b82f6' : 'transparent',
                      color: activeCategory === cat ? 'white' : '#64748b',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {cat}
                    <span style={{ 
                      fontSize: '10px', 
                      background: activeCategory === cat ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '100px'
                    }}>
                      {cat === "All" ? appointments.length : appointments.filter(a => a.status === cat).length}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={20} color="#3b82f6" />
                    Upcoming Appointments
                  </h3>
                
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="Search appointments..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          padding: '8px 12px 8px 36px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13px',
                          width: '220px',
                          outline: 'none',
                          background: '#f8fafc'
                        }}
                      />
                      <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    </div>

                    <select 
                      value={selectedDoctorId} 
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        background: '#f8fafc', 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        color: '#1e293b',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">All Doctors</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                    </select>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                      <button 
                        onClick={() => setViewMode('list')}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: 'none', 
                          background: viewMode === 'list' ? 'white' : 'transparent',
                          boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Users size={14} color={viewMode === 'list' ? '#3b82f6' : '#64748b'} />
                      </button>
                      <button 
                        onClick={() => setViewMode('grid')}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: 'none', 
                          background: viewMode === 'grid' ? 'white' : 'transparent',
                          boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Calendar size={14} color={viewMode === 'grid' ? '#3b82f6' : '#64748b'} />
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading schedules...</div>
                  </div>
                ) : viewMode === 'list' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredAppointments.map((appt: any, i: number) => (
                      <div key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '24px', 
                        borderRadius: '20px', 
                        border: '1px solid #f1f5f9', 
                        background: '#f8fafc',
                        position: 'relative'
                      }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                            {appt.appointment_time ? new Date(appt.appointment_time).toLocaleString('en-US', { month: 'short' }) : '---'}
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>
                            {appt.appointment_time ? new Date(appt.appointment_time).getDate() : '--'}
                          </div>
                        </div>
                        <div style={{ marginLeft: '20px', flex: 1 }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '16px' }}>{appt.patient_name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} /> Assigned to Dr. {appt.doctor_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', fontWeight: 800, color: '#3b82f6', fontSize: '16px' }}>
                              <Clock size={16} />
                              {appt.appointment_time ? new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div style={{ fontSize: '11px', color: appt.status === 'Completed' ? '#10b981' : '#f59e0b', fontWeight: 800, background: appt.status === 'Completed' ? '#f0fdf4' : '#fffbeb', padding: '4px 12px', borderRadius: '100px', marginTop: '8px', display: 'inline-block' }}>
                              {appt.status}
                            </div>
                          </div>
                          
                          <div style={{ position: 'relative' }}>
                            <button 
                              onClick={() => setShowActionMenu(showActionMenu === i ? null : i)}
                              style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                            >
                              <Plus size={16} color="#64748b" style={{ transform: 'rotate(45deg)' }} />
                            </button>
                            
                            {showActionMenu === i && (
                              <div style={{ 
                                position: 'absolute', 
                                right: 0, 
                                top: '100%', 
                                background: 'white', 
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                borderRadius: '12px', 
                                padding: '8px', 
                                zIndex: 10,
                                minWidth: '160px',
                                border: '1px solid #f1f5f9',
                                marginTop: '8px'
                              }}>
                                {["View Details", "Edit Schedule", "Cancel Visit", "Mark Completed"].map(action => (
                                  <div 
                                    key={action}
                                    onClick={() => setShowActionMenu(null)}
                                    style={{ 
                                      padding: '10px 12px', 
                                      fontSize: '12px', 
                                      fontWeight: 700, 
                                      color: action === "Cancel Visit" ? '#ef4444' : '#1e293b',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {action}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {filteredAppointments.map((appt: any, i: number) => (
                      <div key={i} style={{ 
                        padding: '20px', 
                        borderRadius: '24px', 
                        border: '1px solid #f1f5f9', 
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ background: 'white', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>{appt.appointment_time ? new Date(appt.appointment_time).toLocaleString('en-US', { month: 'short' }) : '--'}</div>
                            <div style={{ fontSize: '16px', fontWeight: 900 }}>{appt.appointment_time ? new Date(appt.appointment_time).getDate() : '--'}</div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 800, background: '#eff6ff', padding: '4px 10px', borderRadius: '100px' }}>
                            {appt.appointment_time ? new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{appt.patient_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Dr. {appt.doctor_name}</div>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ fontSize: '10px', fontWeight: 800, color: appt.status === 'Completed' ? '#10b981' : '#f59e0b' }}>{appt.status.toUpperCase()}</span>
                           <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredAppointments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #e2e8f0' }}>
                    <Calendar size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <p style={{ color: '#94a3b8', margin: 0, fontWeight: 600 }}>No matching appointments found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ 
              background: 'white', 
              padding: '32px', 
              borderRadius: '24px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="#10b981" />
                Medical Staff
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {doctors.map((doc: any, i: number) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '14px', 
                      background: '#fff', 
                      border: '2px solid #3b82f6', 
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} 
                        alt="Doc" 
                        style={{ width: '100%', height: '100%' }} 
                      />
                    </div>
                    <div style={{ marginLeft: '12px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>Dr. {doc.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                        <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                        Consulting Now
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
              padding: '24px', 
              borderRadius: '24px', 
              color: 'white'
            }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Need Help?</h4>
              <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '8px', lineHeight: 1.5 }}>
                Use the Doctor Availability view for a detailed calendar perspective.
              </p>
              <button 
                onClick={() => window.location.href = '/tenant/appointments/doctor-calendar'}
                style={{ 
                  marginTop: '16px', 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: 'rgba(255,255,255,0.2)', 
                  color: 'white', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Go to Calendar View
              </button>
            </div>
          </aside>
        </div>

        {/* Booking Modal */}
        {showBookModal && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
          }}>
            <div style={{ 
              background: 'white', 
              padding: '40px', 
              borderRadius: '32px', 
              width: '100%', 
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                height: '6px', 
                background: 'linear-gradient(to right, #3b82f6, #10b981)' 
              }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: 0 }}>Book Appointment</h2>
                  <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Fill in details to schedule a visit.</p>
                </div>
                <button 
                  onClick={() => setShowBookModal(false)} 
                  style={{ 
                    border: 'none', 
                    background: '#f1f5f9', 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBook}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Patient
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="Search patient name or MRN..." 
                        value={modalSearchPatient}
                        onChange={(e) => setModalSearchPatient(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                      />
                      <Users size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    
                    <div style={{ 
                      maxHeight: '150px', 
                      overflowY: 'auto', 
                      background: '#f8fafc', 
                      borderRadius: '16px', 
                      border: '1px solid #f1f5f9',
                      padding: '8px'
                    }}>
                      {patients.filter(p => !modalSearchPatient || p.name.toLowerCase().includes(modalSearchPatient.toLowerCase()) || p.mrn.includes(modalSearchPatient)).map(p => (
                        <div 
                          key={p.id}
                          onClick={() => { setBookingForm({...bookingForm, patient_id: p.id}); setModalSearchPatient(p.name); }}
                          style={{ 
                            padding: '10px 16px', 
                            borderRadius: '10px', 
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                            background: bookingForm.patient_id === p.id ? '#3b82f6' : 'transparent',
                            color: bookingForm.patient_id === p.id ? 'white' : '#1e293b',
                            marginBottom: '4px'
                          }}
                        >
                          {p.name} ({p.mrn})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Assign Doctor
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      required 
                      value={bookingForm.doctor_id}
                      style={{ 
                        width: '100%', 
                        padding: '16px 44px 16px 16px', 
                        borderRadius: '16px', 
                        border: '2px solid #f1f5f9', 
                        fontWeight: 700, 
                        appearance: 'none',
                        background: '#f8fafc',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                      onChange={e => setBookingForm({...bookingForm, doctor_id: e.target.value})}
                    >
                      <option value="">Select Medical Professional...</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <User size={18} color="#94a3b8" />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Choose Slot (Searchable Grid)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input 
                      type="date" 
                      value={modalSelectedDate}
                      onChange={(e) => setModalSelectedDate(e.target.value)}
                      style={{ ...inputStyle }}
                    />
                    
                    {loadingSlots ? (
                      <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>Checking doctor availability...</div>
                    ) : bookingForm.doctor_id ? (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}>
                        {doctorSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.isBooked}
                            onClick={() => setBookingForm({...bookingForm, appointment_time: `${modalSelectedDate} ${slot.time}`})}
                            style={{
                              padding: '10px',
                              borderRadius: '10px',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: slot.isBooked ? 'not-allowed' : 'pointer',
                              background: bookingForm.appointment_time.includes(slot.time) ? '#10b981' : (slot.isBooked ? '#f1f5f9' : '#eef2ff'),
                              color: bookingForm.appointment_time.includes(slot.time) ? 'white' : (slot.isBooked ? '#cbd5e1' : '#3b82f6'),
                              opacity: slot.isBooked ? 0.6 : 1
                            }}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                        Please select a doctor to see available slots.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowBookModal(false)} 
                    style={{ 
                      flex: 1, 
                      padding: '18px', 
                      borderRadius: '18px', 
                      border: '2px solid #f1f5f9', 
                      background: 'white', 
                      fontWeight: 800, 
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="button-primary"
                    style={{ 
                      flex: 2, 
                      padding: '18px', 
                      borderRadius: '18px', 
                      boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <CheckCircle size={20} />
                    Confirm Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
