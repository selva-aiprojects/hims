import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const tenantName = 'Apollo Hospitals - Professional Ltd';

test.describe('Patient journey from sidebar', () => {
  test('sidebar order and OPD/IPD journey smoke', async ({ page }) => {
    test.setTimeout(150000);
    const auth = new AuthHelper(page);
    
    const patientName = `Flow Test ${Date.now()}`;

    const apiErrors: string[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        apiErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    await auth.loginTenant(tenantName);

    const labels = await page.locator('.sidebar .nav-item span').evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim()).filter(Boolean)
    );
    // Updated journey labels to match premium Sidebar mapping
    const journey = ['OPD Center', "OPD Queue", 'Consultation Desk', 'IPD Admission Hub', 'Bed Management', 'Discharge Summaries'];
    const presentJourney = journey.filter((label) => labels.includes(label));
    expect(presentJourney).toEqual(journey);

    await auth.navigateToSidebar('Consultation Desk');
    await expect(page).toHaveURL(/\/tenant\/opd\/consultation/);
    await expect(page.getByText('No Active Patient')).toBeVisible();

    await auth.navigateToSidebar('OPD Center');
    await expect(page).toHaveURL(/\/tenant\/opd\/registration/);
    await expect(page.getByRole('heading', { name: 'OPD Professional Intake Desk' })).toBeVisible();

    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(patientName);
    await expect(page.getByText('NEW PATIENT PROFILE')).toBeVisible();
    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    await page.locator('label:has-text("Date of Birth")').locator('xpath=following-sibling::input').fill('1990-01-15');
    await page.locator('label:has-text("Blood Group")').locator('xpath=following-sibling::select').selectOption('O+');
    await page.locator('label:has-text("Occupation")').locator('xpath=following-sibling::input').fill('QA');
    await page.locator('label:has-text("Weight")').locator('xpath=following-sibling::input').fill('70');
    await page.locator('label:has-text("BP")').locator('xpath=following-sibling::input').fill('120/80');
    await page.locator('label:has-text("Temp")').locator('xpath=following-sibling::input').fill('98.6');
    await page.locator('label:has-text("Height")').locator('xpath=following-sibling::input').fill('172');

    await page.waitForResponse(response => response.url().endsWith('/api/hospital/doctors') && response.status() === 200, { timeout: 15000 });
    const doctorCards = page.locator('.doctor-card');
    await expect(doctorCards.first()).toBeVisible({ timeout: 10000 });
    const validDoctor = doctorCards.filter({ hasText: /Dr\./ });
    await expect(validDoctor.first()).toBeVisible({ timeout: 10000 });
    await validDoctor.first().click();

    const finalizeButton = page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i });
    await expect(finalizeButton).toBeEnabled({ timeout: 10000 });
    await finalizeButton.click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /Registration Successful|Visit generated/ })).toBeVisible({ timeout: 15000 });

    await auth.navigateToSidebar("OPD Queue");
    await expect(page).toHaveURL(/\/tenant\/opd\/queue/);
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Start Consult/i }).click();
    await expect(page).toHaveURL(/\/tenant\/opd\/consultation/);

    const startBtn = page.getByRole('button', { name: /START CONSULTATION NOW/i });
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
    }
    await expect(page.getByText('Ready to Begin?')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible();

    const diagnosis = page.getByPlaceholder(/Enter Clinical Diagnosis/i);
    await diagnosis.fill('Viral Fever');
    await page.getByPlaceholder('Type clinical notes, observations, or chief complaints...').fill('Automated sidebar journey smoke note.');
    await page.getByRole('button', { name: /FINISH CONSULTATION/i }).click();
    await expect(page.getByText('Consultation Finished')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Close & Return to Queue/i }).click();
    await expect(page).toHaveURL(/\/tenant\/opd\/queue/);

    await auth.navigateToSidebar('IPD Admission Hub');
    await expect(page).toHaveURL(/\/tenant\/ipd\/admission-desk/);
    await expect(page.getByText('IPD Admission Desk')).toBeVisible();

    await auth.navigateToSidebar('Bed Management');
    await expect(page).toHaveURL(/\/tenant\/ipd\/beds/);
    await expect(page.getByText('IPD Census & Bed Management')).toBeVisible();
    // Navigate to IPD Admission Hub instead of clicking non-existent button
    await auth.navigateToSidebar('IPD Admission Hub');
    await expect(page).toHaveURL(/\/tenant\/ipd\/admission-desk/);
    
    // Fill out the admission form
    const patientSelect = page.locator('select').first();
    await patientSelect.waitFor({ state: 'visible', timeout: 10000 });
    const patientOption = patientSelect.locator(`option:has-text("${patientName}")`);
    const patientValue = await patientOption.getAttribute('value');
    if (patientValue) {
      await patientSelect.selectOption(patientValue);
    } else {
      await patientSelect.selectOption({ index: 1 });
    }

    const doctorSelect = page.locator('select').nth(1);
    await expect(doctorSelect).toBeVisible({ timeout: 10000 });
    const doctorOption = doctorSelect.locator('option:not(:first-child)').first();
    const doctorValue = await doctorOption.getAttribute('value');
    if (doctorValue) {
      await doctorSelect.selectOption(doctorValue);
    }

    const wardSelect = page.locator('select').nth(2);
    await wardSelect.selectOption({ index: 1 }); // Select Ward

    const bedSelect = page.locator('select').nth(3);
    await page.waitForTimeout(500);
    const bedOptions = bedSelect.locator('option');
    const optionCount = await bedOptions.count();
    expect(optionCount).toBeGreaterThan(1);
    await bedSelect.selectOption({ index: 1 }); // Select first available bed option

    // Fill admission reason
    await page.locator('textarea').fill('Automated admission from patient journey smoke.');
    
    await page.getByRole('button', { name: 'CONFIRM ADMISSION' }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /admitted successfully/i })).toBeVisible({ timeout: 15000 });

    // In the new UI, IPD Census is also under Bed Management or its own route
    // But for the smoke test, we'll navigate to the admissions list directly
    await page.goto('/tenant/ipd/admissions'); 
    await expect(page).toHaveURL(/\/tenant\/ipd\/admissions/);
    await expect(page.getByText('IPD Active Census')).toBeVisible();
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: 'Open' }).click();
    await expect(page.getByText('IPD Patient Record')).toBeVisible();
    await page.getByPlaceholder("Document clinical observations, vital trends, doctor's orders, nursing notes...").fill('Automated inpatient progress note.');
    const noteSaved = page.waitForResponse(response =>
      response.url().includes('/api/hospital/ipd/admissions/') &&
      response.url().endsWith('/notes') &&
      response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: '+ Add Note' }).click();
    expect((await noteSaved).ok()).toBeTruthy();
    await expect(page.locator('.app-toast-success').filter({ hasText: 'Clinical note saved' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Automated inpatient progress note.')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Discharge Patient/i }).click();
    await expect(page.getByText('Confirm Discharge')).toBeVisible();
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: 'Patient discharged successfully' })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/tenant\/ipd\/admissions/);

    await auth.navigateToSidebar('Discharge Summaries');
    await expect(page).toHaveURL(/\/tenant\/ipd\/discharge/);
    await expect(page.getByText('Discharge Summaries Hub')).toBeVisible();
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });

    expect(apiErrors).toEqual([]);
  });
});
