import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const tenantName = 'Apollo Hospitals - Professional Ltd';

test.describe('HIMS Clinical Power Journeys', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginTenant(tenantName);
    await page.waitForLoadState('domcontentloaded');
    
    // Heal masters to ensure data exists
    const tenantId = await page.evaluate(() => localStorage.getItem('tenant'));
    await page.request.get('/api/hospital/heal-all-masters', {
      headers: {
        'x-tenant-id': tenantId || ''
      }
    });
  });

  test('OPD Gold Flow: Registration -> Consultation -> Lab -> Pharmacy -> Billing', async ({ page }) => {
    const patientName = `OPD-Power-${Date.now()}`;
    const medicineName = 'Paracetamol 500mg';
    const labTestName = 'Complete Blood Count (CBC)';

    // 1. DASHBOARD: Capture initial patient inflow
    await page.waitForSelector('.stat-card');
    const inflowCard = page.locator('.stat-card', { hasText: 'Patient Inflow' });
    const initialInflowText = await inflowCard.locator('div').first().innerText();
    const initialInflow = parseInt(initialInflowText) || 0;
    console.log(`Initial Inflow: ${initialInflow}`);

    // 2. REGISTRATION
    await auth.navigateToSidebar('OPD Center');
    const searchInput = page.locator('input.high-velocity-input').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.fill(patientName);
    await page.waitForTimeout(1000);
    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    await page.locator('label:has-text("Gender")').locator('xpath=following-sibling::select').selectOption('Male');
    
    // Assign Doctor
    const firstDoctor = page.locator('.doctor-card').first();
    await expect(firstDoctor).toBeVisible({ timeout: 10000 });
    await firstDoctor.click({ force: true });
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    const toast = page.locator('.app-toast-success, .app-toast-error');
    await expect(toast).toBeVisible({ timeout: 15000 });
    const isError = await page.locator('.app-toast-error').isVisible();
    if (isError) {
      const errorText = await page.locator('.app-toast-error').textContent();
      throw new Error(`Registration failed with error: ${errorText}`);
    }

    // 3. CONSULTATION
    await auth.navigateToSidebar('OPD Queue');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Start Consult/i }).click();
    
    // Handle Start Overlay
    const startBtn = page.getByRole('button', { name: /START CONSULTATION NOW/i });
    try {
      await startBtn.waitFor({ state: 'visible', timeout: 5000 });
      await startBtn.click();
    } catch (e) {
      console.log("Start overlay not found or already started.");
    }
    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible();

    // NEW: Verify Predictive Insights Bar
    await expect(page.getByText('Predicted Time')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Complexity', { exact: true })).toBeVisible();
    await expect(page.getByText('Priority Level')).toBeVisible();
    
    // Add Diagnosis
    const diagnosisInput = page.locator('input').first();
    await diagnosisInput.fill('Viral Fever');
    
    // Add Medicine
    await page.getByPlaceholder(/Search medicines.*composition/i).fill(medicineName);
    await page.getByText(medicineName).first().click();
    
    // Add Lab Test
    await page.click('text=Lab Tests');
    await page.getByText(labTestName).first().click();
    
    // Finish Consultation
    await page.getByRole('button', { name: /FINISH CONSULTATION/i }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible({ timeout: 15000 });

    // 4. PHARMACY
    await auth.navigateToSidebar('Prescription Queue');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Dispense/i }).click();
    await page.click('button:has-text("Validate & Dispense")');
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 5. LAB
    await auth.navigateToSidebar('Laboratory');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Process/i }).first().click();
    await page.click('button:has-text("Verify & Release Results")');

    // 6. BILLING
    await auth.navigateToSidebar('Central Billing');
    await page.getByPlaceholder('Search patient by Name, MRN or Phone...').fill(patientName);
    await page.locator('.patient-search-result', { hasText: patientName }).first().click();
    
    // Verify items are present in bill
    await expect(page.locator('text=Consultation Fee')).toBeVisible();
    await expect(page.locator(`text=${medicineName}`)).toBeVisible();
    await expect(page.locator(`text=${labTestName}`)).toBeVisible();

    // Verify discount rules (Govt Norms)
    const medicineRow = page.locator('tr', { hasText: medicineName });
    await expect(medicineRow.locator('input[type="number"]').nth(1)).toBeDisabled();

    const consultationRow = page.locator('tr', { hasText: 'Consultation Fee' });
    await expect(consultationRow.locator('input[type="number"]').nth(1)).toBeEnabled();

    // 7. DASHBOARD: Verify inflow incremented
    await page.waitForSelector('.stat-card');
    const finalInflowCard = page.locator('.stat-card', { hasText: 'Patient Inflow' });
    const finalInflowText = await finalInflowCard.locator('div').first().innerText();
    const finalInflow = parseInt(finalInflowText) || 0;
    expect(finalInflow).toBeGreaterThan(initialInflow);
  });

  test('IPD Power Flow: Admission -> Diagnostics -> Pharmacy -> Bed Charges -> Discharge', async ({ page }) => {
    const patientName = `IPD-Power-${Date.now()}`;

    // 1. REGISTRATION (Emergency entry via OPD)
    await auth.navigateToSidebar('OPD Center');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(patientName);
    await page.waitForTimeout(1000);
    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    const firstDoctor = page.locator('.doctor-card').first();
    await expect(firstDoctor).toBeVisible({ timeout: 10000 });
    await firstDoctor.click({ force: true });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 2. ADMISSION
    await auth.navigateToSidebar('IPD Admission Hub');
    await page.getByText('+ Admit Patient').first().click({ timeout: 15000 });
    const patientSelect = page.locator('form select').first();
    await patientSelect.selectOption({ label: patientName });
    await page.locator('form select').nth(1).selectOption({ index: 1 }); // Select Ward
    await page.getByRole('button', { name: 'Confirm Admission' }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 3. CENSUS & IN-PATIENT CARE
    // For Census, we go to admissions
    await page.goto('/tenant/ipd/admissions');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: 'Open' }).click();
    
    // Add Service Charge (Doctor Round)
    await page.click('text=Add Service Charge');
    await page.getByLabel('Service Category').selectOption('Doctor Visit');
    await page.getByPlaceholder('Charge Amount').fill('1000');
    await page.click('button:has-text("Post Charge")');
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 4. DISCHARGE
    await page.getByRole('button', { name: /Discharge Patient/i }).click();
    await page.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 5. BILLING VERIFICATION
    await auth.navigateToSidebar('Central Billing');
    await page.getByPlaceholder('Search patient by Name, MRN or Phone...').fill(patientName);
    await page.locator('.patient-search-result', { hasText: patientName }).first().click();
    
    await expect(page.locator('text=Bed Charges')).toBeVisible();
    await expect(page.locator('text=Doctor Visit')).toBeVisible();
  });

  test('Predictive Intelligence Dashboard Validation', async ({ page }) => {
    await page.waitForSelector('text=Professional Intelligence Suite');
    await expect(page.getByText(/Professional Intelligence Suite/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Operational Accuracy/i)).toBeVisible();
    await expect(page.getByText(/Clinical Load Complexity/i)).toBeVisible();
    await expect(page.getByText(/Predicted Throughput/i)).toBeVisible();

    // Verify AI Labels
    await expect(page.getByText('Professional Intelligence Suite')).toBeVisible();
    await expect(page.getByText('AI SYNCED')).toBeVisible();
  });
});
