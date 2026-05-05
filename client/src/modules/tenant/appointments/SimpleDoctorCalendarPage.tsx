import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle, 
  Stethoscope,
  Info,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

export default function DoctorAvailabilityPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [blockMode, setBlockMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [docRes, patRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/staff`, { headers }),
        axios.get(`${API_BASE}/api/patients?limit=100`, { headers })
      ]);
      
      const doctorList = docRes.data.filter((s: any) => s.role === 'doctor' || s.role === 'DOCTOR');
      setDoctors(doctorList);
      setPatients(patRes.data || []);
      
      if (doctorList.length > 0) {
        setSelectedDoctor(doctorList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor) {
      fetchSchedule();
    }
  }, [selectedDoctor, currentDate]);

  const fetchSchedule = async () => {
    try {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const response = await axios.get(
        `${API_BASE}/api/doctors/${selectedDoctor.id}/schedule?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        { headers }
      );
      setAppointments(response.data.appointments || []);
      setAvailability(response.data.availability || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBlockSlot = async (time: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const existing = availability.find(a => a.date.split('T')[0] === dateStr && a.start_time === time);
      
      const payload = {
        date: dateStr,
        startTime: time,
        endTime: calculateEndTime(time),
        isAvailable: existing ? !existing.is_available : false // If doesn't exist, we are blocking it (false)
      };

      await axios.post(`${API_BASE}/api/doctors/${selectedDoctor.id}/availability`, payload, { headers });
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert("Failed to update availability");
    }
  };

  const calculateEndTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    let totalMins = h * 60 + m + 30;
    const nh = Math.floor(totalMins / 60);
    const nm = totalMins % 60;
    return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
  };

  const bookAppointment = async () => {
    if (!selectedPatient || !selectedTime || !selectedDoctor) {
      alert("Please ensure patient, doctor, and slot are selected.");
      return;
    }

    try {
      const appointmentDateTime = new Date(`${selectedDate?.toDateString()} ${selectedTime}`);
      const appointmentData = {
        patient_id: selectedPatient,
        doctor_id: selectedDoctor.id,
        appointment_time: appointmentDateTime.toISOString(),
        status: 'Scheduled'
      };

      await axios.post(`${API_BASE}/api/appointments`, appointmentData, { headers });
      fetchSchedule();
      setShowBookingModal(false);
      setSelectedPatient("");
      alert("Success! Appointment has been scheduled.");
    } catch (err) {
      console.error(err);
      alert("Booking failed. Please try again.");
    }
  };

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const weekDates = getWeekDates();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ background: '#f4f7fa', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: '24px 40px' }}>
        <Header title="Schedule Management" />

        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top Control Bar Redesign */}
          <section style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'white',
            padding: '24px 32px',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid #eef2f6'
          }}>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '16px', 
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Stethoscope size={24} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Clinician</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={selectedDoctor?.id || ""} 
                      onChange={(e) => setSelectedDoctor(doctors.find(d => d.id === e.target.value))}
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: 800, 
                        color: '#1e293b', 
                        border: 'none', 
                        background: 'none', 
                        paddingRight: '24px',
                        appearance: 'none',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '8px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <button onClick={() => {
                  const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d);
                }} style={navBtnStyle}><ChevronLeft size={16} /></button>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', margin: 0, minWidth: '160px', textAlign: 'center' }}>
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => {
                  const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d);
                }} style={navBtnStyle}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setBlockMode(!blockMode)} 
                style={{ 
                  ...actionBtnStyle, 
                  background: blockMode ? '#ef4444' : '#f1f5f9', 
                  color: blockMode ? 'white' : '#475569',
                  border: blockMode ? 'none' : '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: blockMode ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                {blockMode ? <Lock size={16} /> : <Unlock size={16} />}
                {blockMode ? "Exit Block Mode" : "Manage Unavailability"}
              </button>
              <button onClick={() => setCurrentDate(new Date())} style={{ ...actionBtnStyle, background: 'white', color: '#1e293b', border: '1px solid #e2e8f0' }}>Today</button>
            </div>
          </section>

          {blockMode && (
            <div style={{ 
              background: '#fff1f2', 
              padding: '16px 24px', 
              borderRadius: '16px', 
              border: '1px solid #fda4af',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <AlertCircle size={20} color="#e11d48" />
              <div style={{ fontSize: '14px', color: '#9f1239', fontWeight: 700 }}>
                <strong>Unavailability Mode Active:</strong> Click any slot to toggle its availability. Blocked slots will appear red and cannot be booked.
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div style={{ 
            background: 'white', 
            borderRadius: '32px', 
            overflow: 'hidden', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            border: '1px solid #eef2f6'
          }}>
            {/* Grid Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '100px repeat(7, 1fr)', 
              background: '#fcfdfe',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ padding: '24px', borderRight: '1px solid #f1f5f9' }}></div>
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} style={{ 
                    padding: '20px 12px', 
                    textAlign: 'center', 
                    borderRight: i < 6 ? '1px solid #f1f5f9' : 'none',
                    background: isToday ? 'rgba(14, 165, 233, 0.04)' : 'transparent'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isToday ? '#0ea5e9' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                    </span>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: isToday ? '#0ea5e9' : '#1e293b', marginTop: '2px' }}>{date.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
              {timeSlots.map((time, slotIdx) => (
                <div key={slotIdx} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '100px repeat(7, 1fr)',
                  borderBottom: '1px solid #f8fafc'
                }}>
                  <div style={{ 
                    padding: '12px 8px', 
                    textAlign: 'center', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    color: '#cbd5e1',
                    background: '#fcfdfe',
                    borderRight: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>{time}</div>
                  
                  {weekDates.map((date, dayIdx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    const appt = appointments.find(a => 
                      new Date(a.appointment_time).getHours() === parseInt(time.split(':')[0]) &&
                      new Date(a.appointment_time).getMinutes() === parseInt(time.split(':')[1]) &&
                      new Date(a.appointment_time).toDateString() === date.toDateString()
                    );

                    const block = availability.find(a => 
                      a.date.split('T')[0] === dateStr && 
                      a.start_time === time && 
                      !a.is_available
                    );
                    
                    return (
                      <div key={dayIdx} style={{ 
                        padding: '4px', 
                        borderRight: dayIdx < 6 ? '1px solid #f8fafc' : 'none',
                        background: isToday ? 'rgba(14, 165, 233, 0.02)' : 'transparent'
                      }}>
                        {appt ? (
                          <div style={{
                            background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {appt.patient_name}
                          </div>
                        ) : block ? (
                          <div 
                            onClick={() => blockMode && toggleBlockSlot(time, date)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#b91c1c',
                              borderRadius: '10px',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: blockMode ? 'pointer' : 'default'
                            }}
                          >
                            <X size={14} />
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              if (blockMode) {
                                toggleBlockSlot(time, date);
                              } else {
                                setSelectedTime(time);
                                setSelectedDate(date);
                                setShowBookingModal(true);
                              }
                            }}
                            className="slot-btn"
                            style={{
                              width: '100%',
                              height: '40px',
                              borderRadius: '10px',
                              border: '1px dashed #e2e8f0',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#cbd5e1',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Modal Redesign */}
        {showBookingModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <button onClick={() => setShowBookingModal(false)} style={closeBtnStyle}><X size={20} /></button>
              
              <div style={{ display: 'flex' }}>
                {/* Left Side: Summary */}
                <div style={{ width: '40%', background: '#f8fafc', padding: '40px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CalendarIcon size={28} color="#0ea5e9" />
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: 0 }}>Confirm Slot</h2>
                  <p style={{ color: '#64748b', marginTop: '12px', fontSize: '14px' }}>Review the appointment details before confirming.</p>
                  
                  <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={summaryItemStyle}>
                      <Clock size={16} color="#0ea5e9" />
                      <div>
                        <div style={summaryLabelStyle}>Time</div>
                        <div style={summaryValueStyle}>{selectedTime}</div>
                      </div>
                    </div>
                    <div style={summaryItemStyle}>
                      <CalendarIcon size={16} color="#0ea5e9" />
                      <div>
                        <div style={summaryLabelStyle}>Date</div>
                        <div style={summaryValueStyle}>{selectedDate?.toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Form */}
                <div style={{ width: '60%', padding: '40px' }}>
                  <label style={inputLabelStyle}>Select Patient</label>
                  <select 
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select patient...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
                  </select>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button onClick={() => setShowBookingModal(false)} style={cancelBtnStyle}>Discard</button>
                    <button onClick={bookAppointment} style={confirmBtnStyle}>Confirm Appointment</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .slot-btn:hover { border-color: #0ea5e9 !important; background: rgba(14, 165, 233, 0.05) !important; color: #0ea5e9 !important; }
          .loader { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-bottom-color: #0ea5e9; border-radius: 50%; animation: rotation 1s linear infinite; }
          @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  );
}

// Styles
const navBtnStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#64748b',
  transition: 'all 0.2s'
};

const actionBtnStyle = {
  padding: '10px 20px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
  border: '1px solid #e2e8f0',
  transition: 'all 0.2s'
};

const modalOverlayStyle: any = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '24px'
};

const modalContentStyle: any = {
  background: 'white',
  borderRadius: '40px',
  width: '100%',
  maxWidth: '900px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 40px 80px -12px rgba(0,0,0,0.25)'
};

const closeBtnStyle: any = {
  position: 'absolute',
  right: '32px',
  top: '32px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: '#f1f5f9',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#64748b',
  zIndex: 10
};

const summaryItemStyle: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px',
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
};

const summaryLabelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em'
};

const summaryValueStyle = {
  fontSize: '15px',
  fontWeight: 800,
  color: '#1e293b',
  marginTop: '2px'
};

const inputLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: '#64748b',
  marginBottom: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em'
};

const selectStyle: any = {
  width: '100%',
  padding: '18px 48px 18px 18px',
  borderRadius: '18px',
  border: '2px solid #f1f5f9',
  background: '#f8fafc',
  fontSize: '16px',
  fontWeight: 700,
  color: '#1e293b',
  outline: 'none',
  appearance: 'none' as const,
  cursor: 'pointer'
};

const cancelBtnStyle = {
  flex: 1,
  padding: '20px',
  borderRadius: '20px',
  border: '2px solid #f1f5f9',
  background: 'white',
  color: '#64748b',
  fontWeight: 800,
  fontSize: '16px',
  cursor: 'pointer'
};

const confirmBtnStyle = {
  flex: 2,
  padding: '20px',
  borderRadius: '20px',
  border: 'none',
  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
  color: 'white',
  fontWeight: 800,
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  boxShadow: '0 12px 24px -6px rgba(37, 99, 235, 0.4)'
};



