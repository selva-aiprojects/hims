import { TimeSlot, Appointment, ScheduleRule } from '../types/appointment';

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  duration: number,
  appointments: Appointment[]
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes + duration <= endMinutes) {
    const timeString = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
    
    const hasAppointment = appointments.some(apt => {
      const aptTime = new Date(apt.appointment_time);
      const aptTimeString = `${aptTime.getHours().toString().padStart(2, '0')}:${aptTime.getMinutes().toString().padStart(2, '0')}`;
      return aptTimeString === timeString;
    });
    
    slots.push({
      time: timeString,
      available: !hasAppointment,
      appointment: hasAppointment ? appointments.find(apt => {
        const aptTime = new Date(apt.appointment_time);
        const aptTimeString = `${aptTime.getHours().toString().padStart(2, '0')}:${aptTime.getMinutes().toString().padStart(2, '0')}`;
        return aptTimeString === timeString;
      }) : undefined
    });
    
    currentMinutes += duration;
  }
  
  return slots;
};

export const getWeekDates = (date: Date = new Date()) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDates.push(d);
  }
  
  return weekDates;
};

export const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const getScheduleForDay = (schedules: ScheduleRule[], weekday: number) => {
  return schedules.filter(schedule => schedule.weekday === weekday && schedule.is_active);
};

export const isToday = (date: Date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isPastDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};
