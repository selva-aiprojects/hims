import { test, expect, Page } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const TENANT = 'Millenium Hospitals Group of Companies Ltd';

async function loginAndGo(page: Page, path: string) {
  const auth = new AuthHelper(page);
  await auth.loginTenant(TENANT);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
}

// Sets mock encounter then reloads; waits until the War-Room title or No Active Patient is visible
async function loadConsultationWithMock(page: Page, enc: object) {
  await loginAndGo(page, '/tenant/opd/consultation');
  await page.evaluate((e) => localStorage.setItem('currentEncounter', JSON.stringify(e)), enc);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // NEW: Handle the 'START CONSULTATION NOW' overlay that blocks interaction
  const startBtn = page.getByRole('button', { name: /START CONSULTATION NOW/i });
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(500); // Allow overlay to fade
  }
}

// Use valid UUID-format IDs so the backend does a graceful null lookup
// instead of crashing with "invalid input syntax for type uuid"
let _encSeq = 1;
const ENC = (tag: string) => {
  const n = String(_encSeq++).padStart(12, '0');
  const uuid = `00000000-0000-4000-a000-${n}`;
  return {
    id: uuid, patient_id: uuid,
    patient_name: `Test Patient ${tag}`, mrn: `MRN-${tag}`,
    age: 35, gender: 'Male', token: 1,
    vitals: { bp: '120/80', temp: '98.6', weight: '70' },
    complaints: 'Routine checkup'
  };
};

// ─── Suite 1: OPD Registration ────────────────────────────────────────────────
test.describe('OPD-1: Registration Page', () => {

  test('OPD-1.1 Page loads with correct title and key UI elements', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page).toHaveURL(/opd\/registration/);
    await expect(page.getByPlaceholder('Type Phone, Name or MRN to begin...')).toBeVisible();
    await expect(page.getByText('IDENTIFY OR REGISTER PATIENT')).toBeVisible();
    await expect(page.getByText('ABHA IDENTITY (ABDM)')).toBeVisible();
  });

  test('OPD-1.2 Live search input accepts text', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    const input = page.getByPlaceholder('Type Phone, Name or MRN to begin...');
    await input.fill('TestSearch');
    await expect(input).toHaveValue('TestSearch');
  });

  test('OPD-1.3 Typing fewer than 3 chars shows no results', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill('ab');
    await page.waitForTimeout(600);
    await expect(page.locator('button:has-text("SELECT")')).toHaveCount(0);
  });

  test('OPD-1.4 Unknown name opens new patient registration form', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(`NoMatch${Date.now()}`);
    await page.waitForTimeout(1500);
    await expect(page.getByText('NEW PATIENT PROFILE')).toBeVisible();
  });

  test('OPD-1.5 New patient form fields are interactive', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(`Auto${Date.now()}`);
    await page.waitForTimeout(1500);
    const nameInput = page.locator('label').filter({ hasText: 'Full Name*' }).locator('+ input');
    await nameInput.fill('Regression Patient A');
    await expect(nameInput).toHaveValue('Regression Patient A');
  });

  test('OPD-1.6 Vitals fields accept valid data', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await page.getByPlaceholder('e.g. 70').fill('72');
    await page.getByPlaceholder('e.g. 120/80').fill('118/76');
    await page.getByPlaceholder('e.g. 98.6').fill('98.4');
    await page.getByPlaceholder('e.g. 175').fill('168');
    await expect(page.getByPlaceholder('e.g. 70')).toHaveValue('72');
  });

  test('OPD-1.7 Doctor list section is present', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page.getByText('SELECT CONSULTING DOCTOR')).toBeVisible();
    const docCount = await page.locator('button').filter({ hasText: /Dr\./ }).count();
    const emptyMsg = await page.getByText(/No doctors|SEARCHING/i).count();
    expect(docCount + emptyMsg).toBeGreaterThan(0);
  });

  test('OPD-1.8 Doctor search filter input is present', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    const srch = page.getByPlaceholder('Search doctor by name or specialty...');
    await expect(srch).toBeVisible();
    await srch.fill('Cardiology');
    await expect(srch).toHaveValue('Cardiology');
  });

  test('OPD-1.9 Finalize button disabled when form is empty', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i })).toBeDisabled();
  });

  test('OPD-1.10 ABHA consent checkbox is interactive', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    const cb = page.locator('#abha-consent');
    await cb.check();
    await expect(cb).toBeChecked();
    await cb.uncheck();
    await expect(cb).not.toBeChecked();
  });

  test('OPD-1.11 GET OTP button requires consent', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page.getByRole('button', { name: /GET OTP/i })).toBeDisabled();
    await page.locator('#abha-consent').check();
    await expect(page.getByRole('button', { name: /GET OTP/i })).toBeEnabled();
  });

  test('OPD-1.12 Recently Processed section is visible', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page.getByText('RECENTLY PROCESSED')).toBeVisible();
    await expect(page.getByRole('button', { name: /REFRESH/i })).toBeVisible();
  });
});

// ─── Suite 2: OPD Queue ───────────────────────────────────────────────────────
test.describe('OPD-2: Queue Page', () => {

  test('OPD-2.1 Queue page loads at correct URL', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/queue');
    await expect(page).toHaveURL(/opd\/queue/);
  });

  test('OPD-2.2 Queue page sidebar is rendered', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/queue');
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('OPD-2.3 Queue page body renders without crash', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/queue');
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(10);
  });
});

// ─── Suite 3: OPD Consultation Page ──────────────────────────────────────────
test.describe('OPD-3: Consultation Page', () => {

  test('OPD-3.1 Shows No Active Patient when no encounter in localStorage', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/consultation');
    await page.evaluate(() => localStorage.removeItem('currentEncounter'));
    await page.reload();
    await expect(page.getByText(/No Active Patient/i)).toBeVisible({ timeout: 10000 });
  });

  test('OPD-3.2 Return to Queue button navigates correctly', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/consultation');
    await page.evaluate(() => localStorage.removeItem('currentEncounter'));
    await page.reload();
    await page.getByRole('button', { name: /Return to Queue/i }).click();
    await expect(page).toHaveURL(/opd\/queue/);
  });

  test('OPD-3.3 Mock encounter loads consultation war-room', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e1'));
    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible({ timeout: 10000 });
  });

  test('OPD-3.4 Diagnosis input accepts text', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e2'));
    const d = page.getByPlaceholder(/Enter Clinical Diagnosis/i);
    await d.fill('Viral Fever');
    await expect(d).toHaveValue('Viral Fever');
  });

  test('OPD-3.5 Clinical notes textarea accepts text', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e3'));
    const n = page.getByPlaceholder(/Type clinical notes/i);
    await n.fill('Patient reports chest tightness.');
    await expect(n).toHaveValue('Patient reports chest tightness.');
  });

  test('OPD-3.6 All three tab buttons are visible', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e4'));
    await expect(page.getByRole('button', { name: /Prescription/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Lab Tests/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clinical History/i })).toBeVisible();
  });

  test('OPD-3.7 Lab Tests tab is clickable and switches content', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e5'));
    await page.getByRole('button', { name: /Lab Tests/i }).click();
    // Verify lab tab was activated — prescription tab should lose blue bg
    await expect(page.getByRole('button', { name: /Lab Tests/i })).toHaveCSS(
      'background-color', /59, 130, 246|3b82f6/i, { timeout: 5000 }
    );
  });

  test('OPD-3.8 Clinical History tab is clickable', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e6'));
    await page.getByRole('button', { name: /Clinical History/i }).click();
    await expect(page.getByRole('button', { name: /Clinical History/i })).toHaveCSS(
      'background-color', /59, 130, 246|3b82f6/i, { timeout: 5000 }
    );
  });

  test('OPD-3.9 IPD Admission button is present and shows reason field', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e7'));
    const btn = page.locator('button').filter({ hasText: /IPD Admission/ }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await expect(page.getByPlaceholder(/Acute clinical|Post-Op Care/i)).toBeVisible({ timeout: 5000 });
  });

  test('OPD-3.10 Follow-up tag appends text to notes', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e8'));
    await page.locator('button').filter({ hasText: /Follow-up \(7D\)/ }).first().click();
    await expect(page.getByPlaceholder(/Type clinical notes/i)).toHaveValue(/FOLLOW_UP_7D/);
  });

  test('OPD-3.11 Finish button label changes when diagnosis entered', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e9'));
    await expect(page.locator('button').filter({ hasText: /DIAGNOSIS REQUIRED/ }).first()).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/Enter Clinical Diagnosis/i).fill('Hypertension');
    await expect(page.locator('button').filter({ hasText: /FINISH CONSULTATION/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test('OPD-3.12 AI Advisor button is visible', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e10'));
    await expect(page.locator('button').filter({ hasText: /AI ADVISOR/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('OPD-3.13 Patient HUD shows vitals from mock encounter', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('e11'));
    await expect(page.getByText('Test Patient e11')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('120/80')).toBeVisible();
  });
});

// ─── Suite 4: OPD End-to-End Journey ─────────────────────────────────────────
test.describe('OPD-4: End-to-End Journey Flow', () => {

  test('OPD-4.1 Registration: search → form expand → fill vitals → doctor area', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(`FlowTest${Date.now()}`);
    await page.waitForTimeout(1500);
    await expect(page.getByText('NEW PATIENT PROFILE')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('e.g. 70').fill('68');
    await page.getByPlaceholder('e.g. 120/80').fill('122/78');
    await expect(page.getByText('SELECT CONSULTING DOCTOR')).toBeVisible();
    const docBtns = page.locator('button').filter({ hasText: /Dr\./ });
    if (await docBtns.count() > 0) {
      await docBtns.first().click();
      await expect(page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i })).toBeEnabled({ timeout: 5000 });
    } else {
      await expect(page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i })).toBeVisible();
    }
  });

  test('OPD-4.2 Sidebar has navigation links', async ({ page }) => {
    await loginAndGo(page, '/tenant/opd/registration');
    await expect(page.locator('.sidebar')).toBeVisible();
    const links = page.locator('.sidebar').locator('a.nav-item');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('OPD-4.3 Consultation: diagnosis → tab switch → finish button ready', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('flow1'));
    await page.getByPlaceholder(/Enter Clinical Diagnosis/i).fill('Osteoarthritis');
    await expect(page.locator('button').filter({ hasText: /FINISH CONSULTATION/ }).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Lab Tests/i }).click();
    await page.getByRole('button', { name: /Prescription/i }).click();
    await expect(page.locator('button').filter({ hasText: /FINISH CONSULTATION/ }).first()).toBeVisible();
  });

  test('OPD-4.4 Consultation: IPD admission flow shows reason field', async ({ page }) => {
    await loadConsultationWithMock(page, ENC('flow2'));
    await page.getByPlaceholder(/Enter Clinical Diagnosis/i).fill('Hypertensive Emergency');
    const btn = page.locator('button').filter({ hasText: /IPD Admission/ }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await expect(page.getByText('ADMISSION REASON (FOR ADMISSION DESK)')).toBeVisible({ timeout: 5000 });
    const r = page.getByPlaceholder(/Acute clinical|Post-Op Care/i);
    await r.fill('Hypertensive Emergency – BP 190/120');
    await expect(r).toHaveValue('Hypertensive Emergency – BP 190/120');
  });
});
