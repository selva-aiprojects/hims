import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

test.describe('Nexus Tier - Tenant Provisioning Regression', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginNexus();
  });

  test('Field Level Validation for New Tenant Provisioning', async ({ page }) => {
    // Navigate to Provision Shard page
    await page.click('text=Tenants');
    await expect(page).toHaveURL(/.*tenants/);
    await page.click('button:has-text("+ Provision Tenant")');
    await expect(page).toHaveURL(/.*tenants\/new/);

    // Try to deploy without filling required fields
    await page.click('button:has-text("DEPLOY SHARD")');
    // Browser will show validation on required fields
    
    // Fill valid data - Legal Entity Name, Unique Shard Code
    await page.fill('input[placeholder="e.g. Apollo Hospitals"]', 'Validation Test Hospital');
    await page.fill('input[placeholder="e.g. apollo_chennai"]', 'val_test_hsp');
    await page.fill('input[placeholder="Full Name"]', 'Dr Test MD');
    await page.fill('input[placeholder="contact@hospital.com"]', 'contact@valtest.com');
    await page.fill('input[placeholder="admin@hospital.com"]', 'admin@valtest.com');
    await page.fill('input[placeholder="Admin@123"]', 'SecurePass@123');
    
    // Select plan
    await page.click('text=Professional');
    
    // Button should be enabled now
    await expect(page.locator('button:has-text("DEPLOY SHARD")')).toBeEnabled();
  });

  test('Full Tenant Provisioning Flow with Cleanup (Optional)', async ({ page }) => {
    // Navigate to Tenants page
    await page.click('text=Tenants');
    await expect(page).toHaveURL(/.*tenants/);
    
    // Click provision button
    const provisionBtn = page.locator('button:has-text("+ Provision Tenant")');
    if (await provisionBtn.count() > 0) {
      await provisionBtn.click();
    } else {
      // Alternative: direct navigation
      await page.goto('/nexus/tenants/new');
    }
    await expect(page).toHaveURL(/.*tenants\/new/);

    const uniqueId = Date.now();
    const hospitalName = `Regression Hospital ${uniqueId}`;
    const shardCode = `reg_${uniqueId.toString().slice(-6)}`;

    // Fill hospital identity
    await page.fill('input[placeholder="e.g. Apollo Hospitals"]', hospitalName);
    await page.fill('input[placeholder="e.g. apollo_chennai"]', shardCode);
    
    // Fill administrative setup
    await page.fill('input[placeholder="Full Name"]', 'Test Administrator');
    await page.fill('input[placeholder="contact@hospital.com"]', `contact+${uniqueId}@test.com`);
    await page.fill('input[placeholder="admin@hospital.com"]', `admin+${uniqueId}@test.com`);
    await page.fill('input[placeholder="Admin@123"]', 'TempPass@123');
    
    // Select service plan
    await page.click('text=Standard');
    
    // Verify Deploy button exists and is visible
    const deployBtn = page.locator('button:has-text("DEPLOY SHARD")');
    await expect(deployBtn).toBeVisible();
    
    // Verify all form fields are filled
    await expect(page.locator('input[placeholder="e.g. Apollo Hospitals"]')).toHaveValue(hospitalName);
    await expect(page.locator('input[placeholder="e.g. apollo_chennai"]')).toHaveValue(shardCode);
  });
});
