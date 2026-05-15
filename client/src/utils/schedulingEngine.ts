
export const getSlotState = ({
  date,
  time,
  appointments,
  leaves,
  schedules,
  overrides,
  doctorStatus,
}: any) => {
  const now = new Date();
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const slotDate = new Date(y, mo - 1, d, h, mi);
  
  // Buffer of 30 mins to allow editing/booking current/very recent slots
  // Comparison is done in local time as slotDate is constructed from local components
  const isPast = slotDate.getTime() < (now.getTime() - 30 * 60 * 1000);
  const isCurrent = Math.abs(slotDate.getTime() - now.getTime()) < 30 * 60 * 1000;
  
  const weekday = new Date(date).getDay();

  // 1. Doctor Global Status Check (Emergency) - Highest priority, blocks everything
  if (doctorStatus?.status === 'EMERGENCY') {
    return { status: 'EMERGENCY', color: '#be123c', label: 'EMERGENCY', isBookable: false, isPast, isCurrent };
  }

  // 2. Appointment Check
  const appointment = appointments.find((a: any) => {
    const apptDate = new Date(a.appointment_time);
    const apptDateStr = apptDate.toLocaleDateString('en-CA');
    const apptTime = `${apptDate.getHours().toString().padStart(2, '0')}:${apptDate.getMinutes().toString().padStart(2, '0')}`;
    return apptDateStr === date && apptTime === time;
  });

  if (appointment) {
    const isDelayed = doctorStatus?.delay_minutes > 0;
    return { 
      status: 'BOOKED', 
      color: isDelayed ? '#7e22ce' : '#3b82f6', // Purple if delayed, Blue otherwise
      label: isDelayed ? `${appointment.patient_name} (DELAYED)` : appointment.patient_name, 
      isBookable: false, 
      appointment, 
      isPast, 
      isCurrent 
    };
  }

  // 3. Leave Check
  const leave = leaves.find((l: any) => date >= l.start_date && date <= l.end_date);
  if (leave) {
    return { status: 'LEAVE', color: '#94a3b8', label: leave.leave_type || 'LEAVE', isBookable: false, isPast, isCurrent };
  }

  // 4. Master Schedule
  const schedule = schedules.find((s: any) => s.weekday === weekday && time >= s.start_time && time < s.end_time && s.is_active);

  // 5. Override
  const override = overrides.find((o: any) => o.override_date === date && time >= o.start_time && time < o.end_time);

  // 6. Availability Logic
  let isAvailable = !!schedule;
  let reason = schedule ? schedule.session_name : 'OFF HOURS';

  if (override) {
    isAvailable = override.is_available;
    reason = override.reason || (isAvailable ? 'OVERRIDE AVAIL' : 'BLOCKED');
  }

  if (!isAvailable) {
    return { status: 'UNAVAILABLE', color: '#f8fafc', label: reason, isBookable: false, isPast, isCurrent };
  }

  // 7. Handle Delay Indication
  if (doctorStatus?.delay_minutes > 0) {
    return { 
      status: 'DELAYED_AVAIL', 
      color: '#d97706', // Marigold for Delay
      label: `AVAIL (+${doctorStatus.delay_minutes}m)`, 
      isBookable: !isPast, 
      isPast,
      isCurrent
    };
  }

  return {
    status: 'AVAILABLE',
    color: '#dcfce7', // Light green for Available
    label: 'AVAILABLE',
    isBookable: !isPast,
    isPast,
    isCurrent
  };
};
