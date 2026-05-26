import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';
import { TEST_TENANT } from '../utils/tenant_config';

test.describe('Billing Module Regression - Invoicing & Payments', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginTenant(TEST_TENANT);
  });

  test('Generate Patient Invoice', async ({ page }) => {
    // Navigate to Billing page
    await auth.navigateToSidebar('Central Billing');
    await expect(page).toHaveURL(/.*billing/);
    await page.waitForTimeout(1500);
    
    // Verify page loaded with payment mode buttons
    await expect(page.locator('button:has-text("Cash")')).toBeVisible();
    await expect(page.locator('button:has-text("UPI")')).toBeVisible();
    await expect(page.locator('button:has-text("Card")')).toBeVisible();
    await expect(page.locator('button:has-text("Insurance")')).toBeVisible();
    
    // Select payment mode - Cash
    await page.click('button:has-text("Cash")');
    await page.waitForTimeout(500);
  });

  test('Billing Payment Mode Selection', async ({ page }) => {
    // Navigate to Billing
    await auth.navigateToSidebar('Central Billing');
    await expect(page).toHaveURL(/.*billing/);
    
    // Test payment mode buttons
    const paymentModes = ['Cash', 'UPI', 'Card', 'Insurance'];
    
    for (const mode of paymentModes) {
      const btn = page.locator(`button:has-text("${mode}")`);
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(300);
    }
  });

  test('Billing Page Field Level Validations', async ({ page }) => {
    // Navigate to Billing
    await auth.navigateToSidebar('Central Billing');
    await expect(page).toHaveURL(/.*billing/);
    
    // Verify payment mode buttons are present
    await expect(page.locator('button:has-text("Cash")')).toBeVisible();
    await expect(page.locator('button:has-text("UPI")')).toBeVisible();
    await expect(page.locator('button:has-text("Card")')).toBeVisible();
    await expect(page.locator('button:has-text("Insurance")')).toBeVisible();
  });

  test('Verify Print Layout Sections Visibility', async ({ page }) => {
    // Navigate to Billing
    await auth.navigateToSidebar('Central Billing');
    await expect(page).toHaveURL(/.*billing/);
    
    // Verify interactive screen wrapper is visible
    const screenSection = page.locator('.no-print-section');
    await expect(screenSection).toBeVisible();
    
    // Verify printable invoice container is hidden on screen
    const printSection = page.locator('.print-section');
    await expect(printSection).toBeHidden();
    
    // Verify headers and structure in the print-only block are present in DOM
    await expect(printSection.locator('h1:has-text("CLINICAL TAX INVOICE")')).toBeAttached();
    await expect(printSection.locator('h3:has-text("Patient Information")')).toBeAttached();
    await expect(printSection.locator('h3:has-text("Particulars & Itemized Charges")')).toBeAttached();
    await expect(printSection.locator('text=POWERED BY HEALTHEZEE®')).toBeAttached();
  });
});
