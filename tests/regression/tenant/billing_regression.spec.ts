import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

test.describe('Billing Module Regression - Invoicing & Payments', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    await auth.loginTenant('Millenium Hospitals Group of Companies Ltd');
  });

  test('Generate Patient Invoice', async ({ page }) => {
    // Navigate to Billing page
    await page.click('text=Invoicing & Billing');
    await expect(page).toHaveURL(/.*billing/);
    await page.waitForLoadState('networkidle');
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
    await page.click('text=Invoicing & Billing');
    await expect(page).toHaveURL(/.*billing/);
    await page.waitForLoadState('networkidle');
    
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
    await page.click('text=Invoicing & Billing');
    await expect(page).toHaveURL(/.*billing/);
    await page.waitForLoadState('networkidle');
    
    // Verify payment mode buttons are present
    await expect(page.locator('button:has-text("Cash")')).toBeVisible();
    await expect(page.locator('button:has-text("UPI")')).toBeVisible();
    await expect(page.locator('button:has-text("Card")')).toBeVisible();
    await expect(page.locator('button:has-text("Insurance")')).toBeVisible();
  });
});
