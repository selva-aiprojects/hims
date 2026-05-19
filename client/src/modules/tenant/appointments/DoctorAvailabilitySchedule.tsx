import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, ChevronLeft, ChevronRight, Filter, CheckCircle, X } from 'lucide-react';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import { API_BASE_URL as API_BASE } from '../../../config/api';
import { Doctor, Appointment, ScheduleRule, TimeSlot } from '../../../types/appointment';
import { generateTimeSlots, getWeekDates, formatTime, isToday, isPastDate, getScheduleForDay } from '../../../utils/appointmentUtils';

export default function DoctorAvailabilitySchedule() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'booked'>('all');

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorData();
    }
  }, [selectedDoctor, currentWeek]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/hospital/doctors`, { headers });
      const doctorsList = response.data || [];
      setDoctors(doctorsList);
      if (doctorsList.length > 0) {
        setSelectedDoctor(doctorsList[0]);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorData = async () => {
    if (!selectedDoctor) return;

    try {
      const start = getWeekDates(currentWeek)[0];
      const end = getWeekDates(currentWeek)[6];
      
      const response = await axios.get(
        `${API_BASE}/api/doctors/${selectedDoctor.id}/availability-rules?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        { headers }
      );

      setAppointments(response.data.appointments || []);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const getSlotsForDay = (date: Date): TimeSlot[] => {
    const weekday = date.getDay();
    const daySchedule = getScheduleForDay(schedules, weekday);
    
    if (daySchedule.length === 0) return [];

    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_time);
      return aptDate.toDateString() === date.toDateString();
    });

    const allSlots: TimeSlot[] = [];
    daySchedule.forEach(schedule => {
      const slots = generateTimeSlots(
        schedule.start_time,
        schedule.end_time,
        schedule.slot_duration,
        dayAppointments
      );
      allSlots.push(...slots);
    });

    // Remove duplicates and sort
    const uniqueSlots = allSlots.filter((slot, index, self) =>
      index === self.findIndex((s) => s.time === slot.time)
    ).sort((a, b) => a.time.localeCompare(b.time));

    return uniqueSlots;
  };

  
  if (loading) {
    return (
      <div className="dashboard-layout" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#64748b' }}>Loading doctor availability...</div>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates(currentWeek);

  return (
    <div className="dashboard-layout" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '24px' }}>
        <Header title="Doctor Availability Schedule" />

        {/* Controls Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px', 
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Doctor Selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={20} style={{ color: '#64748b' }} />
              <select
                value={selectedDoctor?.id || ''}
                onChange={(e) => setSelectedDoctor(doctors.find(d => d.id === e.target.value) || null)}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  minWidth: '200px',
                  cursor: 'pointer'
                }}
              >
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name} {doctor.specialization && ` - ${doctor.specialization}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigateWeek('prev')}
                style={{
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              
              <div style={{ textAlign: 'center', minWidth: '200px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                  {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Week {Math.ceil((weekDates[0].getDate() + new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), 1).getDay()) / 7)}
                </div>
              </div>
              
              <button
                onClick={() => navigateWeek('next')}
                style={{
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Slots</option>
                <option value="available">Available Only</option>
                <option value="booked">Booked Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Time</div>
            {weekDates.map((date, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                textAlign: 'center',
                background: isToday(date) ? '#eef2ff' : 'transparent',
                borderLeft: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: isToday(date) ? '#4f46e5' : '#64748b' }}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: isToday(date) ? '#4f46e5' : '#1e293b',
                  marginTop: '4px'
                }}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {(() => {
              const allTimeSlots = new Set<string>();
              weekDates.forEach(date => {
                getSlotsForDay(date).forEach(slot => allTimeSlots.add(slot.time));
              });
              
              const sortedTimes = Array.from(allTimeSlots).sort();
              
              return sortedTimes.map(time => (
                <div key={time} style={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ 
                    padding: '12px 16px', 
                    fontSize: '12px', 
                    fontWeight: 500, 
                    color: '#64748b',
                    background: '#fafbfc'
                  }}>
                    {formatTime(time)}
                  </div>
                  
                  {weekDates.map((date, dayIndex) => {
                    const daySlots = getSlotsForDay(date);
                    const slot = daySlots.find(s => s.time === time);
                    const isPast = isPastDate(date);
                    
                    return (
                      <div key={dayIndex} style={{ 
                        padding: '8px',
                        borderLeft: '1px solid #f1f5f9',
                        background: isPast ? '#f8fafc' : 'white'
                      }}>
                        {slot && (
                          <div style={{
                            padding: '8px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            textAlign: 'center',
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            background: slot.available 
                              ? (isPast ? '#e2e8f0' : '#dcfce7') 
                              : '#fee2e2',
                            color: slot.available 
                              ? (isPast ? '#64748b' : '#166534') 
                              : '#dc2626',
                            opacity: isPast ? 0.5 : 1,
                            transition: 'all 0.2s'
                          }}>
                            {slot.available ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <CheckCircle size={12} />
                                Available
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <X size={12} />
                                  Booked
                                </div>
                                {slot.appointment?.patient_name && (
                                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                    {slot.appointment.patient_name}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          marginTop: '16px', 
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#dcfce7', borderRadius: '4px' }}></div>
            Available
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '4px' }}></div>
            Booked
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#e2e8f0', borderRadius: '4px' }}></div>
            Past/Unavailable
          </div>
        </div>
      </main>
    </div>
  );
}
