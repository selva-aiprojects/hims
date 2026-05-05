import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { Plus, ChevronRight, ChevronLeft, X } from 'lucide-react';

export default function SimpleDoctorCalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchAppointments();
    }
  }, [selectedDoctor, currentDate]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/hospital/staff`, { headers });
      const doctorList = response.data.filter((staff: any) => 
        staff.role === 'doctor' || staff.role === 'DOCTOR'
      );
      setDoctors(doctorList);
      if (doctorList.length > 0 && !selectedDoctor) {
        setSelectedDoctor(doctorList[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  };

  const fetchAppointments = async () => {
    if (!selectedDoctor) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/appointments`, { headers });
      const doctorAppointments = response.data.filter((apt: any) => 
        apt.doctor_id === selectedDoctor && 
        new Date(apt.appointment_time).toDateString() === currentDate.toDateString()
      );
      setAppointments(doctorAppointments);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    return slots;
  };

  const hasAppointmentAtTime = (time: string) => {
    return appointments.some((apt: any) => {
      const aptTime = new Date(apt.appointment_time);
      const [hour, minute] = time.split(':').map(Number);
      const slotTime = new Date(currentDate);
      slotTime.setHours(hour, minute);
      
      // Check if appointment is within 30 minutes of slot
      const timeDiff = Math.abs(slotTime.getTime() - aptTime.getTime());
      return timeDiff < 30 * 60 * 1000; // 30 minutes in milliseconds
    });
  };

  const isSlotUnavailableForDate = (time: string, date: Date) => {
    const slotKey = `${date.toDateString()}-${time}`;
    return unavailableSlots.includes(slotKey);
  };

  const toggleUnavailableSlot = (time: string, date: Date) => {
    const slotKey = `${date.toDateString()}-${time}`;
    
    if (unavailableSlots.includes(slotKey)) {
      // Remove from unavailable Slots
      setUnavailableSlots(prev => prev.filter(slot => slot !== slotKey));
    } else {
      // Add to unavailable Slots
      setUnavailableSlots(prev => [...prev, slotKey]);
    }
  };

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();
    const timeSlots = generateTimeSlots();
    
    return (
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 800 }}>
          Week View - {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '1px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Time column */}
          <div style={{ background: '#f8fafc', padding: '8px 4px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{ height: '40px' }}></div>
            {timeSlots.map((time, i) => (
              <div key={i} style={{ height: '40px', display: 'flex', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>
                {time}
              </div>
            ))}
          </div>
          
          {/* Days of week */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
            <div key={dayIndex} style={{ background: '#f8fafc' }}>
              <div style={{ padding: '8px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                {day}
              </div>
              {weekDates.map((date, dateIndex) => {
                if (date.getDay() === dayIndex) {
                  return (
                    <div key={dateIndex} style={{ height: '40px', padding: '2px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '10px', textAlign: 'center', marginBottom: '2px' }}>
                        {date.getDate()}
                      </div>
                      {timeSlots.map((time, slotIndex) => {
                        const hasAppointment = hasAppointmentAtTime(time);
                        const isUnavailable = isSlotUnavailableForDate(time, date);

                        return (
                          <div 
                            key={slotIndex}
                            style={{
                              height: '36px',
                              background: hasAppointment ? '#3b82f6' : isUnavailable ? '#ef4444' : '#10b981',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              margin: '1px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px'
                            }}
                            title={
                              hasAppointment ? 'Booked' : 
                              isUnavailable ? 'Unavailable (Surgery/Urgent)' : 'Available'
                            }
                            onClick={() => {
                              if (selectedDoctor && !hasAppointment) {
                                toggleUnavailableSlot(time, date);
                              }
                            }}
                          >
                            {hasAppointment ? (
                              <X size={12} style={{ color: 'white' }} />
                            ) : isUnavailable ? (
                              <div style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>🚫</div>
                            ) : (
                              <Plus size={12} style={{ color: 'white' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = generateTimeSlots();
    
    return (
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 800 }}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '16px' }}>
          {timeSlots.map((time, i) => {
            const hasAppointment = hasAppointmentAtTime(time);

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                <div style={{ width: '60px', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                  {time}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: '40px',
                    background: hasAppointment ? '#3b82f6' : '#10b981',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    margin: '0 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={hasAppointment ? 'Booked' : 'Available'}
                >
                  {hasAppointment ? (
                    <X size={16} style={{ color: 'white' }} />
                  ) : (
                    <Plus size={16} style={{ color: 'white' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '16px' }}>Loading Doctor Calendar...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Doctor Calendar" />

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          
          {/* Header Controls */}
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name}
                  </option>
                ))}
              </select>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 7);
                    setCurrentDate(newDate);
                  }}
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div style={{ fontSize: '16px', fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 7);
                    setCurrentDate(newDate);
                  }}
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Today
              </button>
              
              <button
                onClick={() => {
                  // Quick set availability for today (8 AM - 6 PM)
                  alert('Setting availability for today: 8 AM - 6 PM\n\nIn full system, you can set custom hours per day!');
                }}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                📅 Set Available Today
              </button>
              
              <button
                onClick={() => {
                  setUnavailableSlots([]);
                  alert('All unavailable slots cleared!\n\nDoctors can now:\n• Click green slots to make them unavailable (red) for specific days\n• Click red slots to make them available again');
                }}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: '#64748b',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                🔄 Clear All Unavailable
              </button>
              
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                <strong>How to use:</strong> Click green slots to mark as unavailable (red) for surgery/urgent cases
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div style={{ padding: '24px' }}>
            {renderWeekView()}
          </div>
        </div>
      </main>
    </div>
  );
}
