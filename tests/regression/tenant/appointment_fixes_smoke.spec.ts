import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';
import { TEST_TENANT as tenantName } from '../utils/tenant_config';

const apiBase = 'http://localhost:4000';

function localDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function nextWeekdayDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return localDateKey(date);
}

test.describe('appointment scheduling fixes', () => {
  test('doctor creation, schedules, appointments, dashboard stats, and doctor scoped list', async ({ page }) => {
    test.setTimeout(120000);
    const auth = new AuthHelper(page);
    await auth.loginTenant(tenantName);

    const session = await page.evaluate(() => ({
      token: localStorage.getItem('token') || '',
      tenant: localStorage.getItem('tenant') || '',
      originalRole: localStorage.getItem('role') || '',
      originalUserId: localStorage.getItem('userId') || '',
    }));

    const headers = {
      Authorization: `Bearer ${session.token}`,
      'x-tenant-id': session.tenant,
      'content-type': 'application/json',
    };

    const unique = Date.now();
    const staffPayload = (name: string, email: string) => ({
      name,
      email,
      password: 'Test@1234',
      role: 'doctor',
      specialization: 'Cardiology',
      gender: 'Male',
      experience_years: 5,
      qualifications: 'MBBS',
    });

    const doctorOne = await page.request.post(`${apiBase}/api/hospital/staff`, {
      headers,
      data: staffPayload(`Dr Flow ${unique}`, `dr.flow.${unique}@test.local`),
    });
    expect(doctorOne.ok()).toBeTruthy();
    const doctorOneData = await doctorOne.json();

    const doctorTwo = await page.request.post(`${apiBase}/api/hospital/staff`, {
      headers,
      data: staffPayload(`Dr Other ${unique}`, `dr.other.${unique}@test.local`),
    });
    expect(doctorTwo.ok()).toBeTruthy();
    const doctorTwoData = await doctorTwo.json();

    const doctorsRes = await page.request.get(`${apiBase}/api/hospital/doctors`, { headers });
    expect(doctorsRes.ok()).toBeTruthy();
    const doctors = await doctorsRes.json();
    expect(doctors.map((d: any) => d.id)).toContain(doctorOneData.id);
    expect(doctors.map((d: any) => d.id)).toContain(doctorTwoData.id);

    const scheduleRes = await page.request.get(`${apiBase}/api/doctors/${doctorOneData.id}/schedules`, { headers });
    expect(scheduleRes.ok()).toBeTruthy();
    const schedules = await scheduleRes.json();
    expect(schedules.filter((s: any) => s.session_name === 'Morning OPD' && s.start_time.startsWith('09:00'))).toHaveLength(6);

    const patientPayload = (name: string, phone: string) => ({
      name,
      phone,
      gender: 'Male',
      age: 35,
      dob: '1991-01-01',
      blood_group: 'O+',
      occupation: 'QA',
    });

    const patientOne = await page.request.post(`${apiBase}/api/patients`, {
      headers,
      data: patientPayload(`Appt Flow Patient ${unique}`, `9${`${unique}`.slice(-9)}`),
    });
    expect(patientOne.ok()).toBeTruthy();
    const patientOneData = await patientOne.json();

    const patientTwo = await page.request.post(`${apiBase}/api/patients`, {
      headers,
      data: patientPayload(`Other Flow Patient ${unique}`, `8${`${unique}`.slice(-9)}`),
    });
    expect(patientTwo.ok()).toBeTruthy();
    const patientTwoData = await patientTwo.json();

    const apptDate = nextWeekdayDate();
    const appointmentOne = await page.request.post(`${apiBase}/api/appointments`, {
      headers,
      data: {
        patient_id: patientOneData.id,
        doctor_id: doctorOneData.id,
        appointment_time: `${apptDate}T09:00`,
        status: 'Scheduled',
      },
    });
    expect(appointmentOne.ok()).toBeTruthy();

    const appointmentTwo = await page.request.post(`${apiBase}/api/appointments`, {
      headers,
      data: {
        patient_id: patientTwoData.id,
        doctor_id: doctorTwoData.id,
        appointment_time: `${apptDate}T09:30`,
        status: 'Scheduled',
      },
    });
    expect(appointmentTwo.ok()).toBeTruthy();

    const scopedAppointmentsRes = await page.request.get(`${apiBase}/api/appointments?doctorId=${doctorOneData.id}`, { headers });
    expect(scopedAppointmentsRes.ok()).toBeTruthy();
    const scopedAppointments = await scopedAppointmentsRes.json();
    expect(scopedAppointments.some((a: any) => a.patient_id === patientOneData.id)).toBeTruthy();
    expect(scopedAppointments.some((a: any) => a.patient_id === patientTwoData.id)).toBeFalsy();

    const statsRes = await page.request.get(`${apiBase}/api/doctors/${doctorOneData.id}/stats`, { headers });
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats.patientsSeen).toBeGreaterThanOrEqual(1);
    expect(stats.newPatients).toBeGreaterThanOrEqual(1);

    await page.evaluate(({ doctorId, doctorName }) => {
      localStorage.setItem('role', 'doctor');
      localStorage.setItem('userId', doctorId);
      localStorage.setItem('userName', doctorName);
    }, { doctorId: doctorOneData.id, doctorName: doctorOneData.name });

    await page.goto('/tenant/appointments');
    await expect(page.getByText(patientOneData.name)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(patientTwoData.name)).not.toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'All Doctors' })).toHaveCount(0);

    await page.evaluate((sessionState) => {
      localStorage.setItem('role', sessionState.originalRole);
      localStorage.setItem('userId', sessionState.originalUserId);
    }, session);
  });
});
