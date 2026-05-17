import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const tenantName = 'Apollo Hospitals - Professional Ltd';

test.describe('Patient journey from sidebar', () => {
  test('sidebar order and OPD/IPD journey smoke', async ({ page }) => {
    const auth = new AuthHelper(page);
    
    // Mock doctors API to ensure at least one doctor is always available
    await page.route('**/api/hospital/doctors', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'doc1', name: 'Dr. Test Mock', specialty: 'General Medicine' }
        ])
      });
    });
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

    const firstDoctor = page.locator('.doctor-card').first();
    await expect(firstDoctor).toBeVisible({ timeout: 10000 });
    await firstDoctor.click();

    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: /Registration Successful|Visit generated/ })).toBeVisible({ timeout: 15000 });

    await auth.navigateToSidebar("OPD Queue");
    await expect(page).toHaveURL(/\/tenant\/opd\/queue/);
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Start Consult/i }).click();
    await expect(page).toHaveURL(/\/tenant\/opd\/consultation/);

    // Handle Start Overlay
    const startBtn = page.getByRole('button', { name: /START CONSULTATION NOW/i });
    if (await startBtn.isVisible({ timeout: 10000 })) {
      await startBtn.click();
    }
    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible();

    const diagnosis = page.locator('input').first(); // Using the new input field for diagnosis
    await diagnosis.fill('Viral Fever');
    await page.getByPlaceholder('Type clinical notes, observations, or chief complaints...').fill('Automated sidebar journey smoke note.');
    await page.getByRole('button', { name: /FINISH CONSULTATION/i }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: 'Consultation finalized successfully' })).toBeVisible({ timeout: 15000 });

    await auth.navigateToSidebar('IPD Admission Hub');
    await expect(page).toHaveURL(/\/tenant\/ipd\/admission-desk/);
    await expect(page.getByText('IPD Admission Desk')).toBeVisible();

    await auth.navigateToSidebar('Bed Management');
    await expect(page).toHaveURL(/\/tenant\/ipd\/beds/);
    await expect(page.getByText('IPD Census & Bed Management')).toBeVisible();
    await page.getByText('+ Admit Patient').first().click({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Admit Patient' })).toBeVisible();
    const patientSelect = page.locator('form select').first();
    const patientOption = await patientSelect.locator('option').filter({ hasText: patientName }).first().getAttribute('value');
    expect(patientOption).toBeTruthy();
    await patientSelect.selectOption(patientOption!);
    await page.locator('form select').nth(1).selectOption({ index: 1 });
    await page.getByPlaceholder('e.g. Chest pain, shortness of breath...').fill('Automated admission from patient journey smoke.');
    await page.getByRole('button', { name: 'Confirm Admission' }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: 'Patient admitted successfully' })).toBeVisible({ timeout: 15000 });

    // In the new UI, IPD Census is also under Bed Management or its own route
    // But for the smoke test, we'll navigate to the admissions list directly
    await page.goto('/tenant/ipd/admissions'); 
    await expect(page).toHaveURL(/\/tenant\/ipd\/admissions/);
    await expect(page.getByText('IPD Active Census')).toBeVisible();
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: 'Open' }).click();
    await expect(page.getByText('IPD Patient Record')).toBeVisible();
    await page.getByPlaceholder("Document clinical observations, vital trends, doctor's orders, nursing notes...").fill('Automated inpatient progress note.');
    await page.getByRole('button', { name: '+ Add Note' }).click();
    await expect(page.locator('.app-toast-success').filter({ hasText: 'Clinical note saved' })).toBeVisible({ timeout: 15000 });
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
