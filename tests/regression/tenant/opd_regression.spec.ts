import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';
import { TEST_TENANT } from '../utils/tenant_config';

test.describe('OPD Module Regression - Field Level Validation', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    // Logging into a known tenant shard
    await auth.loginTenant(TEST_TENANT);
  });

  test('Full OPD Registration and Vitals Capture Flow', async ({ page }) => {
    // 1. Navigate to OPD Center
    await auth.navigateToSidebar('OPD Center');
    await expect(page).toHaveURL(/.*opd\/registration/);

    // 2. Register a new patient by typing their name (auto-triggers form)
    const patientName = `Test Patient ${Date.now()}`;
    const searchInput = page.getByPlaceholder('Type Phone, Name or MRN to begin...');
    await searchInput.fill(patientName);
    await page.waitForTimeout(1000); // Allow search/auto-expand
    
    await expect(page.getByText('NEW PATIENT PROFILE')).toBeVisible();
    await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill('9876543210');
    
    // 3. Capture Vitals
    await page.getByPlaceholder('e.g. 70').fill('70');
    await page.getByPlaceholder('e.g. 120/80').fill('120/80');
    await page.getByPlaceholder('e.g. 98.6').fill('98.6');
    await page.getByPlaceholder('e.g. 175').fill('170');
    
    // Assign doctor
    const firstDoctor = page.locator('button').filter({ hasText: /Dr\./ }).first();
    await expect(firstDoctor).toBeVisible();
    await firstDoctor.click();
    
    // Just verify the finalize button is ready
    await expect(page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i })).toBeEnabled();
  });

  test('OPD Registration Form Field Validations', async ({ page }) => {
    // Navigate to OPD Center
    await auth.navigateToSidebar('OPD Center');
    await expect(page).toHaveURL(/.*opd\/registration/);
    
    // Trigger form by typing
    await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(`Validate${Date.now()}`);
    await page.waitForTimeout(1000);
    
    // Try to finalize without mandatory fields
    await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
    
    // Should show error toast for missing mandatory fields
    await expect(page.getByText(/Doctor selection are mandatory/i)).toBeVisible();
  });
});
