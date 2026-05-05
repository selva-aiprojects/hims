import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { Calendar, Clock, Users, Plus, Settings, ChevronRight, ChevronLeft, Check, X, AlertCircle } from 'lucide-react';

export default function DoctorCalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchDoctors();
    if (selectedDoctor) {
      fetchAppointments();
      fetchAvailability();
    }
  }, [selectedDoctor, currentDate]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/hospital/staff`, { headers });
      const doctorList = response.data.filter((staff: any) => staff.role === 'doctor');
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
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDoctor) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/doctor/${selectedDoctor}/availability`, { headers });
      setAvailability(response.data || []);
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    const slotDuration = 30; // 30 minutes
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    return slots;
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

  const isTimeSlotAvailable = (date: Date, time: string) => {
    const dayAvailability = availability.find((avail: any) => 
      new Date(avail.date).toDateString() === date.toDateString()
    );
    
    if (!dayAvailability) return false;
    
    const [hour, minute] = time.split(':').map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hour, minute);
    
    const dayStart = new Date(dayAvailability.start_time);
    const dayEnd = new Date(dayAvailability.end_time);
    
    return slotTime >= dayStart && slotTime <= dayEnd && dayAvailability.is_available;
  };

  const hasAppointmentConflict = (date: Date, time: string) => {
    return appointments.some((apt: any) => {
      const aptTime = new Date(apt.appointment_time);
      const aptDate = new Date(aptTime);
      aptDate.setHours(0, 0, 0, 0);
      
      const [hour, minute] = time.split(':').map(Number);
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute);
      
      // Check if appointment is within 30 minutes of the slot
      const timeDiff = Math.abs(slotTime.getTime() - aptTime.getTime());
      return timeDiff < 30 * 60 * 1000; // 30 minutes in milliseconds
    });
  };

  const handleBookAppointment = async (patientId: string, time: string, date: Date) => {
    try {
      const appointmentData = {
        patient_id: patientId,
        doctor_id: selectedDoctor,
        time: new Date(date).toISOString(),
        status: 'Scheduled'
      };

      await axios.post(`${API_BASE}/api/appointments`, appointmentData, { headers });
      fetchAppointments();
      alert("Appointment booked successfully!");
    } catch (error) {
      alert("Failed to book appointment");
    }
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();
    const timeSlots = generateTimeSlots();
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '1px', background: '#e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
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
                      const isAvailable = isTimeSlotAvailable(date, time);
                      const hasConflict = hasAppointmentConflict(date, time);
                      const appointment = appointments.find((apt: any) => {
                        const aptTime = new Date(apt.appointment_time);
                        const [hour, minute] = time.split(':').map(Number);
                        return aptTime.getHours() === hour && aptTime.getMinutes() === minute;
                      });

                      return (
                        <div 
                          key={slotIndex}
                          style={{
                            height: '36px',
                            background: appointment ? '#3b82f6' : isAvailable ? '#10b981' : '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            margin: '1px',
                            cursor: isAvailable && !hasConflict ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px'
                          }}
                          onClick={() => {
                            if (isAvailable && !hasConflict && !appointment) {
                              // Open patient selection modal
                            }
                          }}
                        >
                          {appointment ? (
                            <span style={{ color: 'white', fontSize: '8px' }}>Booked</span>
                          ) : hasConflict ? (
                            <AlertCircle size={12} style={{ color: '#ef4444' }} />
                          ) : isAvailable ? (
                            <Plus size={12} style={{ color: 'white' }} />
                          ) : (
                            <X size={12} style={{ color: '#94a3b8' }} />
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
            const isAvailable = isTimeSlotAvailable(currentDate, time);
            const hasConflict = hasAppointmentConflict(currentDate, time);
            const appointment = appointments.find((apt: any) => {
              const aptTime = new Date(apt.appointment_time);
              const [hour, minute] = time.split(':').map(Number);
              return aptTime.getHours() === hour && aptTime.getMinutes() === minute;
            });

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                <div style={{ width: '60px', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                  {time}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: '40px',
                    background: appointment ? '#3b82f6' : isAvailable ? '#10b981' : '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    margin: '0 8px',
                    cursor: isAvailable && !hasConflict && !appointment ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => {
                    if (isAvailable && !hasConflict && !appointment) {
                      // Open patient selection modal
                    }
                  }}
                >
                  {appointment ? (
                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>
                      {appointment.patient_name}
                    </div>
                  ) : hasConflict ? (
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                  ) : isAvailable ? (
                    <Plus size={16} style={{ color: 'white' }} />
                  ) : (
                    <X size={16} style={{ color: '#94a3b8' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Doctor Calendar & Availability" />

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
                onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: viewMode === 'week' ? '#3b82f6' : 'white',
                  color: viewMode === 'week' ? 'white' : '#1e293b',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {viewMode === 'week' ? 'Day View' : 'Week View'}
              </button>
              
              <button
                onClick={() => setShowAvailabilityModal(true)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                <Settings size={16} style={{ marginRight: '8px' }} />
                Set Availability
              </button>
            </div>
          </div>

          {/* Calendar View */}
          <div style={{ padding: '24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading calendar...
              </div>
            ) : viewMode === 'week' ? renderWeekView() : renderDayView()}
          </div>
        </div>
      </main>
    </div>
  );
}
