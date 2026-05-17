import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

test.describe('Pharmacy Module Regression - Inventory & Dispensing', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginTenant('Millenium Hospitals Group of Companies Ltd');
  });

  test('Pharmacy Inventory Management - Add Stock', async ({ page }) => {
    // Navigate to Stock Inventory
    await auth.navigateToSidebar('Stock Inventory');
    await expect(page).toHaveURL(/.*pharmacy\/inventory/);
    
    // Click Add New Stock button
    await page.click('button:has-text("+ Add New Stock")');
    await page.waitForTimeout(500);
    
    const medicineName = `Test Medicine ${Date.now()}`;
    const quantity = '100';
    const price = '50.00';
    const expiryDate = '2027-12-31';
    
    // Fill medicine details
    await page.fill('input[placeholder="e.g. Amoxicillin 500mg"]', medicineName);
    
    // Select category
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption('Antibiotic');
    
    // Fill quantity and price
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill(quantity);
    await numberInputs.nth(1).fill(price);
    
    // Fill expiry date
    await page.locator('input[type="date"]').fill(expiryDate);
    
    // Save item
    await page.click('button:has-text("Save Item")');
    
    // Wait for modal to close
    await expect(page.locator('button:has-text("Save Item")')).toBeHidden({ timeout: 10000 });
    
    // Verify medicine was added to inventory
    await expect(page.locator(`text=${medicineName}`)).toBeVisible({ timeout: 5000 });
  });

  test('Medicine Dispensing Workflow', async ({ page }) => {
    // Navigate to Prescription Queue
    await auth.navigateToSidebar('Prescription Queue');
    await expect(page).toHaveURL(/.*pharmacy\/queue/);
    
    // Find patient in queue and click Dispense
    const dispenseButtons = page.locator('button:has-text("Dispense")');
    const count = await dispenseButtons.count();
    
    if (count > 0) {
      await dispenseButtons.first().click();
      await page.waitForTimeout(500);
      
      // Verify fulfillment panel opened with patient and medicine details
      await expect(page.locator('text=ORDER FOR')).toBeVisible();
      await expect(page.locator('button:has-text("Validate & Dispense")')).toBeVisible();
      
      // Process dispensing
      await page.click('button:has-text("Validate & Dispense")');
      await page.waitForTimeout(1000);
    }
  });

  test('Pharmacy Inventory Field Level Validations', async ({ page }) => {
    // Navigate to Stock Inventory
    await auth.navigateToSidebar('Stock Inventory');
    await expect(page).toHaveURL(/.*pharmacy\/inventory/);
    
    // Open Add Stock modal
    await page.click('button:has-text("+ Add New Stock")');
    await page.waitForTimeout(500);
    
    // Try to save without filling required fields
    await page.click('button:has-text("Save Item")');
    
    // Check for browser validation on required fields
    const nameInput = page.locator('input[placeholder="e.g. Amoxicillin 500mg"]');
    const isRequired = await nameInput.evaluate((node: HTMLInputElement) => node.required);
    expect(isRequired).toBe(true);
  });
});
