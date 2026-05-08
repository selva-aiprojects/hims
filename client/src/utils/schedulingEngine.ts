
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
  const slotDate = new Date(`${date}T${time}:00`);
  const isPast = slotDate < new Date(now.getTime() - 30 * 60000); // Buffer for current slot
  const isCurrent = slotDate >= new Date(now.getTime() - 30 * 60000) && slotDate <= now;
  
  const weekday = new Date(date).getDay();

  // 1. Appointment Check (Highest priority - show if someone booked it)
  const appointment = appointments.find((a: any) => {
    const apptDate = new Date(a.appointment_time);
    const apptDateStr = apptDate.toLocaleDateString('en-CA');
    const apptTime = `${apptDate.getHours().toString().padStart(2, '0')}:${apptDate.getMinutes().toString().padStart(2, '0')}`;
    return apptDateStr === date && apptTime === time;
  });

  if (appointment) {
    return { status: 'BOOKED', color: '#2563eb', label: appointment.patient_name, isBookable: false, appointment, isPast, isCurrent };
  }

  // 2. Doctor Global Status Check (Emergency/Delayed)
  if (doctorStatus?.status === 'EMERGENCY') {
    return { status: 'EMERGENCY', color: '#be123c', label: 'EMERGENCY', isBookable: false, isPast, isCurrent };
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
    return { status: 'UNAVAILABLE', color: '#f1f5f9', label: reason, isBookable: !isPast, isPast, isCurrent };
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
    color: '#059669', // Mint Green for Available
    label: 'AVAILABLE',
    isBookable: !isPast,
    isPast,
    isCurrent
  };
};
