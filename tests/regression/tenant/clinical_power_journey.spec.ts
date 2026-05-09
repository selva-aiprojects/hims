import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

const tenantName = 'Apollo Hospitals - Professional Ltd';

test.describe('HIMS Clinical Power Journeys', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginTenant(tenantName);
    await page.waitForLoadState('networkidle');
  });

  test('OPD Gold Flow: Registration -> Consultation -> Lab -> Pharmacy -> Billing', async ({ page }) => {
    const patientName = `OPD-Power-${Date.now()}`;
    const medicineName = 'Paracetamol 500mg';
    const labTestName = 'Complete Blood Count (CBC)';

    // 1. DASHBOARD: Capture initial patient inflow
    await page.goto('/tenant/dashboard');
    await page.waitForLoadState('networkidle');
    const initialInflowText = await page.locator('text=Patient Inflow').locator('xpath=following-sibling::div').first().innerText();
    const initialInflow = parseInt(initialInflowText) || 0;
    console.log(`Initial Inflow: ${initialInflow}`);

    // 2. REGISTRATION
    await page.click('text=OPD Registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(patientName);
    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    await page.locator('label:has-text("Gender")').locator('xpath=following-sibling::select').selectOption('Male');
    
    // Assign Doctor (Ensure a doctor is selected)
    const firstDoctor = page.locator('[role="button"]').filter({ hasText: /^Dr\./ }).first();
    await firstDoctor.click();
    
    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible({ timeout: 15000 });

    // 3. CONSULTATION
    await page.click("text=Doctor's Queue");
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Start Consult/i }).click();
    
    await expect(page.getByText('Clinical Consultation War-Room')).toBeVisible();
    
    // Add Diagnosis
    const diagnosisSelect = page.locator('select').first();
    await diagnosisSelect.selectOption({ index: 1 });
    
    // Add Medicine
    await page.getByPlaceholder('Search medicines, brands, or composition...').fill(medicineName);
    await page.locator('.medicine-suggestion', { hasText: medicineName }).first().click();
    
    // Add Lab Test
    await page.click('text=Lab Tests');
    await page.getByLabel(labTestName).check();
    
    // Finish Consultation
    await page.getByRole('button', { name: /FINISH CONSULTATION/i }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible({ timeout: 15000 });

    // 4. PHARMACY
    await page.click('text=Prescription Queue');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Dispense/i }).click();
    await page.click('button:has-text("Validate & Dispense")');
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 5. LAB
    await page.click('text=Laboratory');
    await expect(page.locator('tr', { hasText: patientName })).toBeVisible({ timeout: 15000 });
    // Process Lab Test (Assume there's a process button)
    await page.locator('tr', { hasText: patientName }).getByRole('button', { name: /Process/i }).first().click();
    await page.click('button:has-text("Verify & Release Results")');

    // 6. BILLING
    await page.click('text=Invoicing & Billing');
    await page.getByPlaceholder('Search patient by Name, MRN or Phone...').fill(patientName);
    await page.locator('.patient-search-result', { hasText: patientName }).first().click();
    
    // Verify items are present in bill
    await expect(page.locator('text=Consultation Fee')).toBeVisible();
    await expect(page.locator(`text=${medicineName}`)).toBeVisible();
    await expect(page.locator(`text=${labTestName}`)).toBeVisible();

    // 7. DASHBOARD: Verify inflow incremented
    await page.goto('/tenant/dashboard');
    await page.waitForLoadState('networkidle');
    const finalInflowText = await page.locator('text=Patient Inflow').locator('xpath=following-sibling::div').first().innerText();
    const finalInflow = parseInt(finalInflowText) || 0;
    expect(finalInflow).toBeGreaterThan(initialInflow);
  });

  test('IPD Power Flow: Admission -> Diagnostics -> Pharmacy -> Bed Charges -> Discharge', async ({ page }) => {
    const patientName = `IPD-Power-${Date.now()}`;

    // 1. REGISTRATION (Emergency entry via OPD)
    await page.click('text=OPD Registration');
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(patientName);
    await page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input').fill(patientName);
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill(`9${Date.now().toString().slice(-9)}`);
    const firstDoctor = page.locator('[role="button"]').filter({ hasText: /^Dr\./ }).first();
    await firstDoctor.click();
    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 2. ADMISSION
    await page.click('text=IPD Bed Map');
    await page.getByText('+ Admit Patient').first().click({ timeout: 15000 });
    const patientSelect = page.locator('form select').first();
    await patientSelect.selectOption({ label: patientName });
    await page.locator('form select').nth(1).selectOption({ index: 1 }); // Select Ward
    await page.getByRole('button', { name: 'Confirm Admission' }).click();
    await expect(page.locator('.app-toast-success')).toBeVisible();

    // 3. CENSUS & IN-PATIENT CARE
    await page.click('text=IPD Census & Daycare');
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
    await page.click('text=Invoicing & Billing');
    await page.getByPlaceholder('Search patient by Name, MRN or Phone...').fill(patientName);
    await page.locator('.patient-search-result', { hasText: patientName }).first().click();
    
    await expect(page.locator('text=Bed Charges')).toBeVisible();
    await expect(page.locator('text=Doctor Visit')).toBeVisible();
  });
});
