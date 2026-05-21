import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const TENANT = 'Apollo Hospitals - Professional Ltd';

test.describe('Patient journey regression: OPD to IPD discharge', () => {
  test('OPD registration, consultation, IPD admission, and discharge summary flow', async ({ page }) => {
    test.setTimeout(180000);
    const auth = new AuthHelper(page);
    const patientName = `E2E Patient ${Date.now()}`;

    await auth.loginTenant(TENANT);

    // OPD registration
    await page.goto('/tenant/opd/registration');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder('Type Phone, Name or MRN to begin...');
    await searchInput.fill(patientName);
    await page.waitForTimeout(2000);
    await expect(page.getByText('NEW PATIENT PROFILE')).toBeVisible({ timeout: 15000 });

    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    await page.locator('label:has-text("Date of Birth")').locator('xpath=following-sibling::input').fill('1990-01-15');
    await page.locator('label:has-text("Blood Group")').locator('xpath=following-sibling::select').selectOption('O+');
    await page.locator('label:has-text("Occupation")').locator('xpath=following-sibling::input').fill('QA');
    await page.locator('label:has-text("Weight")').locator('xpath=following-sibling::input').fill('70');
    await page.locator('label:has-text("BP")').locator('xpath=following-sibling::input').fill('120/80');
    await page.locator('label:has-text("Temp")').locator('xpath=following-sibling::input').fill('98.6');
    await page.locator('label:has-text("Height")').locator('xpath=following-sibling::input').fill('172');

    await page.waitForResponse(response => response.url().includes('/api/hospital/doctors') && response.status() === 200, { timeout: 15000 });
    const doctorCard = page.locator('.doctor-card').filter({ hasText: /Dr\./ }).first();
    await expect(doctorCard).toBeVisible({ timeout: 15000 });
    await doctorCard.click();

    const finalizeButton = page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i });
    await expect(finalizeButton).toBeEnabled({ timeout: 15000 });
    await finalizeButton.click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /Registration Successful|Visit generated/i })).toBeVisible({ timeout: 20000 });

    // OPD queue and consultation
    await auth.navigateToSidebar('OPD Queue');
    await expect(page).toHaveURL(/tenant\/opd\/queue/);
    const queueRow = page.locator('tr', { hasText: patientName }).first();
    await expect(queueRow).toBeVisible({ timeout: 20000 });
    await queueRow.getByRole('button', { name: /Start Consult/i }).click();

    await expect(page).toHaveURL(/tenant\/opd\/consultation/);
    const startConsultButton = page.getByRole('button', { name: /START CONSULTATION NOW/i });
    if (await startConsultButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startConsultButton.click();
    }

    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/Enter Clinical Diagnosis/i).fill('Acute fever');
    await page.getByPlaceholder(/Type clinical notes, observations, or chief complaints/i).fill('Automated OPD consultation note.');
    await page.getByRole('button', { name: /FINISH CONSULTATION/i }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /Consultation Finished|Consultation completed/i })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /Close & Return to Queue/i }).click();
    await expect(page).toHaveURL(/tenant\/opd\/queue/);

    // IPD admission
    await auth.navigateToSidebar('IPD Admission Hub');
    await expect(page).toHaveURL(/tenant\/ipd\/admission-desk/);

    const patientSelect = page.locator('select').first();
    await expect(patientSelect).toBeVisible({ timeout: 15000 });
    const patientOption = patientSelect.locator(`option:has-text("${patientName}")`).first();
    if (await patientOption.count() > 0) {
      const value = await patientOption.getAttribute('value');
      if (value) await patientSelect.selectOption(value);
    } else {
      await patientSelect.selectOption({ index: 1 });
    }

    const doctorSelect = page.locator('select').nth(1);
    await expect(doctorSelect).toBeVisible({ timeout: 10000 });
    const doctorOption = doctorSelect.locator('option:not(:first-child)').first();
    const doctorValue = await doctorOption.getAttribute('value');
    if (doctorValue) await doctorSelect.selectOption(doctorValue);

    const wardSelect = page.locator('select').nth(2);
    if (await wardSelect.count() > 0) {
      await wardSelect.selectOption({ index: 1 });
    }

    const bedSelect = page.locator('select').nth(3);
    await page.waitForTimeout(500);
    if (await bedSelect.locator('option').count() > 1) {
      await bedSelect.selectOption({ index: 1 });
    }

    await page.locator('textarea').fill('Admission for inpatient observation after OPD consultation.');
    await page.getByRole('button', { name: /CONFIRM ADMISSION/i }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /admitted successfully/i })).toBeVisible({ timeout: 20000 });

    // Open patient admission and discharge
    await page.goto('/tenant/ipd/admissions');
    await expect(page).toHaveURL(/tenant\/ipd\/admissions/);
    const admissionRow = page.locator('tr', { hasText: patientName }).first();
    await expect(admissionRow).toBeVisible({ timeout: 20000 });
    await admissionRow.getByRole('button', { name: /Open|View|Details/i }).click();

    await expect(page.getByText(/IPD Patient Record|Discharge Patient/i)).toBeVisible({ timeout: 20000 });
    const notesArea = page.getByPlaceholder(/Document clinical observations|Type clinical notes/i);
    if (await notesArea.isVisible().catch(() => false)) {
      await notesArea.fill('Automated inpatient progress note.');
    }

    const dischargeButton = page.getByRole('button', { name: /Discharge Patient/i }).first();
    await expect(dischargeButton).toBeVisible({ timeout: 15000 });
    await dischargeButton.click();
    await expect(page.getByText(/Confirm Discharge/i)).toBeVisible({ timeout: 15000 });

    const confirmDischarge = page.getByRole('button', { name: /^Discharge$/ });
    if (await confirmDischarge.isVisible().catch(() => false)) {
      await confirmDischarge.click();
    } else {
      await page.getByText('Discharge', { exact: true }).click();
    }

    await expect(page.locator('.app-toast-success').filter({ hasText: /discharged successfully/i })).toBeVisible({ timeout: 20000 });

    await page.goto('/tenant/ipd/discharge');
    await expect(page).toHaveURL(/tenant\/ipd\/discharge/);
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 20000 });
  });
});
