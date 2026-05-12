import React, { useState, useEffect } from "react";
import { API_BASE_URL as API_BASE } from '../../../config/api';
import axios from "axios";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Timer,
  Activity,
  Zap,
  AlertCircle,
  TrendingUp,
  CheckCircle2 as CheckCircleIcon
} from "lucide-react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import { getSlotState } from "../../../utils/schedulingEngine";
import { useSearchParams } from "react-router-dom";



export default function DoctorAvailabilityPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "Operational Calendar";
  
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [doctorStatus, setDoctorStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>({ utilization: 0, retention: 0, avgWait: 0, revenue: 0 });
  
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showActionDrawer, setShowActionDrawer] = useState(false);
  const [selectedSlotState, setSelectedSlotState] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, AVAILABLE, BOOKED

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      console.log("[DEBUG] Fetching Clinical Master Data...");
      const [docRes, patRes] = await Promise.all([
        axios.get(`${API_BASE}/api/hospital/doctors`, { headers }),
        axios.get(`${API_BASE}/api/patients`, { headers }) // Removed limit to avoid potential filter conflicts
      ]);
      console.log(`[DEBUG] Loaded ${docRes.data?.length || 0} doctors and ${patRes.data?.length || 0} patients.`);
      setDoctors(docRes.data || []);
      setPatients(patRes.data || []);
      if (docRes.data?.length > 0) setSelectedDoctor(docRes.data[0]);
    } catch (err) { console.error("[DEBUG] Initialization Error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedDoctor) {
      fetchSchedulingData();
      fetchDoctorStats();
    }
  }, [selectedDoctor, currentDate]);

  const fetchDoctorStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/doctors/${selectedDoctor.id}/stats`, { headers });
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSchedulingData = async () => {
    try {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const response = await axios.get(
        `${API_BASE}/api/doctors/${selectedDoctor.id}/availability-rules?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        { headers }
      );

      setAppointments(response.data.appointments || []);
      setSchedules(response.data.schedules || []);
      setLeaves(response.data.leaves || []);
      setOverrides(response.data.overrides || []);
      setDoctorStatus(response.data.status);
    } catch (err) { console.error(err); }
  };

  const updateDoctorStatus = async (status: string, delay: number = 0) => {
    try {
      await axios.post(`${API_BASE}/api/doctors/${selectedDoctor.id}/status`, { status, delay_minutes: delay }, { headers });
      fetchSchedulingData();
    } catch (err) { console.error(err); }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

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

  if (loading) return <div className="loading-state">Initializing Clinical Engine...</div>;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 32px 32px' }}>
        <Header title="Clinical Scheduling Command" />
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', margin: '32px 0 8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', boxShadow: '0 10px 15px -3px rgba(79, 70, 233, 0.1)' }}>
            <CalendarIcon size={24} />
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: 500, maxWidth: '600px' }}>Unified command center for physician availability, appointment scheduling, and clinical resource optimization.</p>
        </div>
        
        <div style={{ flex: 1, display: 'flex', padding: '24px', gap: '24px', overflow: 'hidden' }}>
          
          {/* LEFT: DOCTOR INFO & QUICK ACTIONS */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none', color: 'white' }}>
               <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>ACTIVE CONTEXT</div>
               <div style={{ fontSize: '14px', fontWeight: 900 }}>{localStorage.getItem("tenantName") || 'Healthezee Hospital'}</div>
               <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', opacity: 0.8 }}>ID: {localStorage.getItem("tenant")?.substring(0, 8)}...</div>
            </div>

            <div style={cardStyle}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={avatarStyle}><User size={24} /></div>
                   <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, marginBottom: '4px', color: '#4f46e5' }}>SELECTED DOCTOR</label>
                      {doctors.length > 0 ? (
                        <select 
                          value={selectedDoctor?.id || ""} 
                          onChange={(e) => setSelectedDoctor(doctors.find(d => d.id === e.target.value))}
                          style={{ ...doctorSelectStyle, border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', fontWeight: 800 }}
                        >
                           <option value="" disabled>Select a doctor...</option>
                           {doctors.map(d => <option key={d.id} value={d.id}>{d.name.toLowerCase().startsWith('dr') ? d.name : `Dr. ${d.name}`}</option>)}
                        </select>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#be123c', fontWeight: 700 }}>No Doctors Loaded</div>
                      )}
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginTop: '4px' }}>{selectedDoctor?.specialization || 'Clinical Staff'}</div>
                   </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <StatusBadge status={doctorStatus?.status} delay={doctorStatus?.delay_minutes} />
                  <div style={dividerStyle} />
                  <h4 style={sectionTitleStyle}>OPERATIONAL OVERRIDES</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                     <button onClick={() => updateDoctorStatus('AVAILABLE', 0)} style={quickBtnStyle('#10b981')}><CheckCircle2 size={14} /> Available</button>
                     <button onClick={() => updateDoctorStatus('DELAYED', 15)} style={quickBtnStyle('#f59e0b')}><Timer size={14} /> +15m Delay</button>
                     <button onClick={() => updateDoctorStatus('DELAYED', 30)} style={quickBtnStyle('#ea580c')}><Timer size={14} /> +30m Delay</button>
                     <button onClick={() => updateDoctorStatus('EMERGENCY', 0)} style={quickBtnStyle('#e11d48')}><ShieldAlert size={14} /> Emergency</button>
                  </div>
               </div>
            </div>

            <div style={cardStyle}>
               <h4 style={sectionTitleStyle}>QUICK SUMMARY</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SummaryItem label="Appointments Today" value={appointments.filter(a => a.appointment_time.startsWith(new Date().toISOString().split('T')[0])).length} icon={<CalendarIcon size={16}/>} />
                  <SummaryItem label="Active Leaves" value={leaves.filter(l => new Date(l.end_date) >= new Date()).length} icon={<ShieldAlert size={16}/>} />
               </div>
               
               <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                  <button 
                    onClick={async () => {
                      if(confirm("Trigger DEEP synchronization for this clinic? This will restore any 'vanished' doctors or patients.")) {
                        try {
                          setLoading(true);
                          await axios.get(`${API_BASE}/api/hospital/heal-all-masters`, { headers });
                          alert("Deep Data Healing complete. Clinical masters restored.");
                          window.location.reload();
                        } catch(e) { alert("Healing failed. Check network."); }
                        finally { setLoading(false); }
                      }
                    }}
                    style={{ ...quickBtnStyle('#6366f1'), width: '100%', borderStyle: 'dashed', marginBottom: '8px' }}
                  >
                    <Activity size={14} /> Heal Clinical Master Data
                  </button>

                  <button 
                    onClick={() => { setLoading(true); fetchSchedulingData(); setTimeout(() => setLoading(false), 500); }}
                    style={{ ...quickBtnStyle('#64748b'), width: '100%' }}
                  >
                    <Zap size={14} /> Force UI Reload
                  </button>
               </div>
            </div>
          </div>

          {/* RIGHT: MAIN CALENDAR / TABS */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
             <div style={{ ...cardStyle, padding: '12px 24px', display: 'flex', gap: '32px' }}>
                {['Operational Calendar', 'Weekly Rules', 'Leave Master', 'Overrides', 'Analytics'].map(tab => (
                   <button 
                     key={tab} 
                     onClick={() => setActiveTab(tab)}
                     style={tabBtnStyle(activeTab === tab)}
                   >
                      {tab}
                   </button>
                ))}
             </div>

             <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'Operational Calendar' && (
                    <div style={{ ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                       <div style={calendarHeaderStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                             <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} style={navBtnStyle}><ChevronLeft size={16} /></button>
                             <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                             <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} style={navBtnStyle}><ChevronRight size={16} /></button>
                          </div>
                          
                          {/* Search & Filter Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                             <div style={{ position: 'relative', width: '240px' }}>
                                <input 
                                  type="text" 
                                  placeholder="Search Patient Slot..." 
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  style={{ ...inputStyle, padding: '10px 16px 10px 36px', fontSize: '12px', borderRadius: '10px' }} 
                                />
                                <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                             </div>
                             <select 
                               value={filterStatus}
                               onChange={(e) => setFilterStatus(e.target.value)}
                               style={{ ...inputStyle, width: '140px', padding: '10px', fontSize: '12px', borderRadius: '10px' }}
                             >
                                <option value="ALL">All Slots</option>
                                <option value="AVAILABLE">Available Only</option>
                                <option value="BOOKED">Booked Only</option>
                             </select>
                          </div>
                       </div>

                      <div style={gridScrollStyle}>
                         <div style={calendarGridStyle}>
                            <div style={{ padding: '20px', borderRight: '1px solid #f1f5f9', background: '#fcfdfe' }}></div>
                             {getWeekDates().map((date, i) => {
                               const isToday = date.toDateString() === new Date().toDateString();
                               const isPastDay = date < new Date(new Date().setHours(0,0,0,0));
                               return (
                                 <div key={i} style={{
                                   ...dayHeaderStyle(isToday),
                                   opacity: isPastDay ? 0.5 : 1,
                                   filter: isPastDay ? 'grayscale(1)' : 'none'
                                 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: isToday ? '#4f46e5' : '#94a3b8' }}>
                                       {isToday ? 'TODAY' : ['SUN','MON','TUE','WED','THU','FRI','SAT'][date.getDay()]}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: isToday ? '#4f46e5' : '#1e293b' }}>{date.getDate()}</div>
                                 </div>
                               );
                             })}

                            {timeSlots.map((time, idx) => (
                               <div key={idx} style={{ display: 'contents' }}>
                                  <div style={timeLabelStyle}>{time}</div>
                                  {getWeekDates().map((date, dayIdx) => {
                                     const state = getSlotState({
                                        date: date.toISOString().split('T')[0],
                                        time,
                                        appointments,
                                        leaves,
                                        schedules,
                                        overrides,
                                        doctorStatus
                                     });

                                     // Apply Filters
                                     const matchesSearch = searchQuery && state.appointment?.patient_name?.toLowerCase().includes(searchQuery.toLowerCase());
                                     const matchesStatus = filterStatus === 'ALL' || 
                                                          (filterStatus === 'AVAILABLE' && (state.status === 'AVAILABLE' || state.status === 'DELAYED_AVAIL')) ||
                                                          (filterStatus === 'BOOKED' && state.status === 'BOOKED');

                                     return (
                                        <div key={`${idx}-${dayIdx}`} style={{ 
                                           ...slotCellWrapperStyle, 
                                           opacity: (searchQuery && !matchesSearch) || !matchesStatus ? 0.3 : 1,
                                           filter: (searchQuery && !matchesSearch) || !matchesStatus ? 'grayscale(0.5)' : 'none'
                                        }}>
                                           <div 
                                             onClick={() => {
                                               setSelectedDate(date);
                                               setSelectedTime(time);
                                               setSelectedSlotState(state);
                                               setShowActionDrawer(true);
                                             }}
                                             style={{ 
                                               ...slotInnerStyle(state),
                                               border: matchesSearch ? '2px solid #f97316' : slotInnerStyle(state).border,
                                               boxShadow: matchesSearch ? '0 0 12px rgba(249, 115, 22, 0.4)' : slotInnerStyle(state).boxShadow,
                                               animation: matchesSearch ? 'pulse 1.5s infinite' : slotInnerStyle(state).animation
                                             }}
                                           >
                                              {state.status === 'BOOKED' ? <User size={12} /> : state.label === 'AVAILABLE' ? <Plus size={12} /> : ''}
                                           </div>
                                        </div>
                                     );
                                  })}
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'Weekly Rules' && <WeeklyScheduleTab doctor={selectedDoctor} schedules={schedules} onUpdate={fetchSchedulingData} />}
                {activeTab === 'Leave Master' && <LeaveTab doctor={selectedDoctor} leaves={leaves} onUpdate={fetchSchedulingData} />}
                {activeTab === 'Overrides' && <OverridesTab doctor={selectedDoctor} overrides={overrides} onUpdate={fetchSchedulingData} />}
                {activeTab === 'Analytics' && <AnalyticsPanel stats={stats} />}
             </div>
          </div>
        </div>

        <SlotActionDrawer 
          open={showActionDrawer} 
          onClose={() => setShowActionDrawer(false)}
          date={selectedDate}
          time={selectedTime}
          state={selectedSlotState}
          doctor={selectedDoctor}
          patients={patients}
          onSuccess={fetchSchedulingData}
        />
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const StatusBadge = ({ status, delay }: any) => {
  const isDelayed = status === 'DELAYED';
  const isEmergency = status === 'EMERGENCY';
  return (
    <div style={{
      padding: '12px',
      borderRadius: '12px',
      background: isEmergency ? '#fff1f2' : isDelayed ? '#fff7ed' : '#f0fdf4',
      border: `1px solid ${isEmergency ? '#fecaca' : isDelayed ? '#ffedd5' : '#dcfce7'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: isEmergency ? '#be123c' : isDelayed ? '#d97706' : '#059669',
        boxShadow: `0 0 10px ${isEmergency ? '#be123c' : isDelayed ? '#d97706' : '#059669'}`
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>LIVE STATUS</div>
        <div style={{ fontSize: '14px', fontWeight: 900, color: isEmergency ? '#be123c' : isDelayed ? '#d97706' : '#065f46' }}>
          {isEmergency ? 'EMERGENCY MODE' : isDelayed ? `DELAYED (${delay}m)` : 'ON SCHEDULE'}
        </div>
      </div>
    </div>
  );
};

const SlotActionDrawer = ({ open, onClose, date, time, state, doctor, patients, onSuccess }: any) => {
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleBook = async () => {
    if (!patientId) return alert("Select patient");
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const dt = new Date(`${dateStr} ${time}`);

      // If slot is UNAVAILABLE, automatically create an override first
      if (state.status === 'UNAVAILABLE') {
        await axios.post(`${API_BASE}/api/doctors/overrides`, {
          doctor_id: doctor.id, override_date: dateStr, start_time: time, end_time: time,
          is_available: true, reason: 'Automatic opening for booking'
        }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" } });
      }

      await axios.post(`${API_BASE}/api/appointments`, {
        patient_id: patientId, doctor_id: doctor.id, appointment_time: dt.toISOString(), status: 'Scheduled'
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" } });
      onSuccess(); onClose();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const applyOverride = async (available: boolean) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/doctors/overrides`, {
        doctor_id: doctor.id, override_date: date.toISOString().split('T')[0], start_time: time, end_time: time,
        is_available: available, reason: reason || (available ? 'Manual Opening' : 'Manual Block')
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" } });
      onSuccess(); onClose();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div style={drawerOverlayStyle}>
       <div style={drawerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>Slot Actions</h2>
             <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '32px' }}>
             <div style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8' }}>{state.status}</div>
             <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>{date?.toLocaleDateString()} @ {time}</div>
          </div>

          {state.status === 'BOOKED' ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={cardStyle}>
                   <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>PATIENT DETAILS</div>
                   <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>{state.appointment?.patient_name}</div>
                   <div style={{ fontSize: '13px', color: '#64748b' }}>MRN: {state.appointment?.patient_mrn || 'N/A'}</div>
                </div>
                <button style={{ ...primaryBtnStyle, background: '#ef4444' }}>Cancel Appointment</button>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                 <div>
                    <label style={labelStyle}>QUICK BOOKING</label>
                    {patients.length > 0 ? (
                      <>
                        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} style={inputStyle} disabled={!state.isBookable}>
                           <option value="">Search patient...</option>
                           {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
                        </select>
                        <button onClick={handleBook} disabled={loading || !state.isBookable} style={{ ...primaryBtnStyle, marginTop: '12px', width: '100%' }}>
                           {loading ? 'Processing...' : 'Confirm Appointment'}
                        </button>
                        {state.status === 'UNAVAILABLE' && (
                          <div style={{ fontSize: '11px', color: '#0ea5e9', marginTop: '8px', fontWeight: 700 }}>
                            <Zap size={10} style={{ display: 'inline', marginRight: '4px' }}/> 
                            Note: This will automatically open this off-hours slot.
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '16px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                        <div style={{ fontSize: '13px', color: '#9a3412', fontWeight: 700 }}>No Patients Found</div>
                        <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '4px' }}>Register patients in the Patient Master first.</div>
                        <button onClick={() => window.location.href='/tenant/patients'} style={{ ...quickBtnStyle('#ea580c'), marginTop: '12px', width: '100%' }}>Register Patient</button>
                      </div>
                    )}
                    {!state.isBookable && <div style={{ fontSize: '11px', color: '#e11d48', marginTop: '4px', fontWeight: 700 }}><AlertCircle size={10}/> Historical slots cannot be modified.</div>}
                 </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                   <label style={labelStyle}>EDIT AVAILABILITY (OVERRIDE)</label>
                   <input type="text" placeholder="Reason (Optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />
                   <div style={{ display: 'flex', gap: '12px' }}>
                      {state.status === 'AVAILABLE' || state.status === 'DELAYED_AVAIL' ? (
                         <button onClick={() => applyOverride(false)} disabled={loading} style={{ ...quickBtnStyle('#e11d48'), flex: 1, padding: '14px' }}>Block Slot</button>
                      ) : (
                         <button onClick={() => applyOverride(true)} disabled={loading} style={{ ...quickBtnStyle('#10b981'), flex: 1, padding: '14px' }}>Open Slot</button>
                      )}
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

// --- STYLES ---

const cardStyle: any = { background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eef2f6' };
const avatarStyle = { width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' };
const doctorSelectStyle = { width: '100%', fontSize: '16px', fontWeight: 800, border: 'none', background: 'none', outline: 'none', cursor: 'pointer', color: '#1e293b' };
const dividerStyle = { height: '1px', background: '#f1f5f9', margin: '8px 0' };
const sectionTitleStyle = { fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 12px 0' };
const quickBtnStyle = (color: string) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: `1px solid ${color}30`, background: `${color}05`, color, fontSize: '11px', fontWeight: 800, cursor: 'pointer' });
const tabBtnStyle = (active: boolean) => ({ padding: '12px 0', border: 'none', background: 'none', fontSize: '14px', fontWeight: 700, color: active ? '#4f46e5' : '#64748b', borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' });
const calendarHeaderStyle = { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const dayHeaderStyle = (isToday: boolean) => ({ 
  padding: '16px 8px', 
  textAlign: 'center' as const, 
  borderRight: '1px solid #f1f5f9', 
  borderBottom: isToday ? '3px solid #4f46e5' : '2px solid #f1f5f9', 
  background: isToday ? '#eef2ff' : 'white',
  position: 'relative' as const
});
const timeLabelStyle = { padding: '12px 8px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 700, color: '#94a3b8', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f8fafc' };

const slotCellWrapperStyle = { padding: '4px', borderRight: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc' };
const slotInnerStyle = (state: any) => {
  const isAvailable = state.status === 'AVAILABLE' || state.status === 'DELAYED_AVAIL';
  const isBookableFuture = state.isBookable && !state.isPast;
  
  return {
    height: '36px', 
    borderRadius: '8px', 
    background: isAvailable ? 'rgba(79, 70, 229, 0.05)' : state.color, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    cursor: state.isPast ? 'not-allowed' : 'pointer', 
    transition: 'all 0.2s', 
    color: isAvailable ? '#4f46e5' : 'white',
    opacity: state.isPast ? 0.3 : (state.status === 'UNAVAILABLE' ? 0.4 : 1),
    boxShadow: (state.status === 'BOOKED' && !state.isPast) ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
    transform: 'scale(1)',
    filter: state.isPast ? 'grayscale(0.8) contrast(0.8)' : 'none',
    pointerEvents: state.isPast ? 'none' as const : 'auto' as const,
    border: state.isCurrent ? '2px solid #4f46e5' : (isBookableFuture ? '1.5px dashed #4f46e5' : 'none'),
    animation: state.isCurrent ? 'pulse 2s infinite' : 'none'
  };
};

const SummaryItem = ({ label, value, icon }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
     <div style={{ color: '#94a3b8' }}>{icon}</div>
     <div style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#64748b' }}>{label}</div>
     <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>{value}</div>
  </div>
);

const navBtnStyle = { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' };
const gridScrollStyle = { 
  flex: 1, 
  overflowY: 'auto' as const,
  maxHeight: 'calc(100vh - 350px)',
  scrollbarWidth: 'thin' as const,
  scrollbarColor: '#e2e8f0 transparent'
};
const calendarGridStyle = { display: 'grid', gridTemplateColumns: '100px repeat(7, 1fr)', background: 'white', minHeight: '800px' };
const drawerOverlayStyle: any = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', justifyContent: 'flex-end' };
const drawerStyle: any = { width: '450px', height: '100%', background: 'white', padding: '40px', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: 600 };
const primaryBtnStyle: any = { padding: '16px', borderRadius: '16px', background: '#4f46e5', color: 'white', border: 'none', fontSize: '16px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' };

// --- TAB PANELS ---

const WeeklyScheduleTab = ({ doctor, schedules, onUpdate }: any) => {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [showAdd, setShowAdd] = useState(false);
  const [newSched, setNewSched] = useState({
    weekday: 1, session_name: 'Morning OPD', start_time: '09:00', end_time: '13:00', slot_duration: 30, consultation_type: 'OPD', is_active: true
  });

  const handleAdd = async () => {
    try {
      await axios.post(`${API_BASE}/api/doctors/schedules`, { ...newSched, doctor_id: doctor.id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" }
      });
      setShowAdd(false);
      onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={cardStyle}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Doctor Recurring Schedule</h3>
          <button onClick={() => setShowAdd(true)} style={quickBtnStyle('#0ea5e9')}><Plus size={16} /> Add Session</button>
       </div>

       <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
             <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f8fafc' }}>
                   <th style={thStyle}>Day</th>
                   <th style={thStyle}>Session</th>
                   <th style={thStyle}>Hours</th>
                   <th style={thStyle}>Type</th>
                </tr>
             </thead>
             <tbody>
                {schedules.map((s: any) => (
                   <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={tdStyle}>{weekdays[s.weekday]}</td>
                      <td style={tdStyle}>{s.session_name}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{s.start_time} - {s.end_time}</td>
                      <td style={tdStyle}><span style={badgeStyle}>{s.consultation_type}</span></td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       {showAdd && (
          <div style={inlineFormStyle}>
             <h4 style={{ marginTop: 0 }}>Define Timing Window</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <select value={newSched.weekday} onChange={(e) => setNewSched({ ...newSched, weekday: parseInt(e.target.value) })} style={inputStyle}>
                   {weekdays.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="text" placeholder="Session Name" value={newSched.session_name} onChange={(e) => setNewSched({ ...newSched, session_name: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', gap: '8px' }}>
                   <input type="time" value={newSched.start_time} onChange={(e) => setNewSched({ ...newSched, start_time: e.target.value })} style={inputStyle} />
                   <input type="time" value={newSched.end_time} onChange={(e) => setNewSched({ ...newSched, end_time: e.target.value })} style={inputStyle} />
                </div>
                <button onClick={handleAdd} style={primaryBtnStyle}>Save Window</button>
             </div>
          </div>
       )}
    </div>
  );
};

const LeaveTab = ({ doctor, leaves, onUpdate }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newLeave, setNewLeave] = useState({ leave_type: 'VACATION', start_date: '', end_date: '', reason: '', is_emergency: false });

  const handleAdd = async () => {
    try {
      await axios.post(`${API_BASE}/api/doctors/leaves`, { ...newLeave, doctor_id: doctor.id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" }
      });
      setShowAdd(false);
      onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={cardStyle}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Leave & Blocked Dates</h3>
          <button onClick={() => setShowAdd(true)} style={quickBtnStyle('#ef4444')}><Plus size={16} /> Record Leave</button>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {leaves.map((l: any) => (
             <div key={l.id} style={leaveCardStyle(l.is_emergency)}>
                <div style={{ fontWeight: 900 }}>{new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{l.leave_type}: {l.reason}</div>
             </div>
          ))}
       </div>

       {showAdd && (
          <div style={{ ...inlineFormStyle, background: '#fef2f2' }}>
             <h4 style={{ marginTop: 0 }}>Block Availability</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <input type="date" value={newLeave.start_date} onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })} style={inputStyle} />
                <input type="date" value={newLeave.end_date} onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })} style={inputStyle} />
                <textarea placeholder="Reason..." value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                <button onClick={handleAdd} style={{ ...primaryBtnStyle, background: '#ef4444' }}>Mark Unavailable</button>
             </div>
          </div>
       )}
    </div>
  );
};

const OverridesTab = ({ doctor, overrides, onUpdate }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newOverride, setNewOverride] = useState({ override_date: '', start_time: '08:00', end_time: '12:00', is_available: true, reason: 'Consultant Visit' });

  const handleAdd = async () => {
    try {
      await axios.post(`${API_BASE}/api/doctors/overrides`, { ...newOverride, doctor_id: doctor.id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-tenant-id": localStorage.getItem("tenant") || "" }
      });
      setShowAdd(false);
      onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={cardStyle}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Specific Session Overrides</h3>
          <button onClick={() => setShowAdd(true)} style={quickBtnStyle('#f97316')}><Plus size={16} /> Add Exception</button>
       </div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {overrides.map((o: any) => (
             <div key={o.id} style={overrideCardStyle(o.is_available)}>
                <div style={{ fontWeight: 800 }}>{new Date(o.override_date).toLocaleDateString()} | {o.start_time} - {o.end_time}</div>
                <div style={{ fontSize: '13px' }}>{o.is_available ? 'Extra Session' : 'Blocked Session'}: {o.reason}</div>
             </div>
          ))}
       </div>

       {showAdd && (
          <div style={{ ...inlineFormStyle, background: '#fff7ed' }}>
             <h4 style={{ marginTop: 0 }}>Add Exception</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <input type="date" value={newOverride.override_date} onChange={(e) => setNewOverride({ ...newOverride, override_date: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', gap: '8px' }}>
                   <input type="time" value={newOverride.start_time} onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })} style={inputStyle} />
                   <input type="time" value={newOverride.end_time} onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })} style={inputStyle} />
                </div>
                <button onClick={handleAdd} style={{ ...primaryBtnStyle, background: '#f97316', gridColumn: 'span 2' }}>Apply Exception</button>
             </div>
          </div>
       )}
    </div>
  );
};

const AnalyticsPanel = ({ stats }: any) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
      {[
        { label: 'Utilization', value: `${Math.round(stats.utilization)}%`, color: '#0ea5e9', icon: <Zap size={20} /> },
        { label: 'Patient Retention', value: `${Math.round(stats.retention)}%`, color: '#10b981', icon: <Activity size={20} /> },
        { label: 'Average Wait', value: `${Math.round(stats.avgWait)}m`, color: '#f59e0b', icon: <Timer size={20} /> },
        { label: 'Revenue', value: `₹${(stats.revenue / 100000).toFixed(1)}L`, color: '#8b5cf6', icon: <TrendingUp size={20} /> }
      ].map(s => (
        <div key={s.label} style={cardStyle}>
          <div style={{ color: s.color, marginBottom: '12px' }}>{s.icon}</div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
};

const thStyle = { padding: '16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' as const };
const tdStyle = { padding: '16px', fontSize: '14px', color: '#1e293b' };
const badgeStyle = { padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', fontSize: '11px', fontWeight: 800, color: '#64748b' };
const inlineFormStyle: any = { marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #eef2f6' };
const leaveCardStyle = (emergency: boolean) => ({ padding: '16px', borderRadius: '16px', background: emergency ? '#fff1f2' : '#f8fafc', border: `1px solid ${emergency ? '#fecaca' : '#eef2f6'}` });
const overrideCardStyle = (avail: boolean) => ({ padding: '16px', borderRadius: '12px', background: avail ? '#f0fdf4' : '#fff7ed', border: `1px solid ${avail ? '#dcfce7' : '#ffedd5'}`, color: avail ? '#166534' : '#9a3412' });
