import { test, expect } from '@playwright/test';

test('Nexus Admin Flow - Login and Tenant Provisioning', async ({ page }) => {
  // 1. Navigate to Login
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/HIMS/);

  // 2. Select Nexus Facility
  await page.click('text=Nexus Administration');
  
  // 3. Login
  await page.fill('input[placeholder="Username or Email"]', 'admin');
  await page.fill('input[placeholder="Password"]', 'admin123');
  await page.click('button:has-text("SIGN IN TO WORKSPACE")');

  // 4. Verify Dashboard Redirect
  await expect(page).toHaveURL(/.*nexus\/dashboard/);
  await expect(page.locator('h1')).toContainText('Nexus Control Plane');

  // 5. Navigate to Tenants
  await page.click('text=Tenants');
  await expect(page).toHaveURL(/.*nexus\/tenants/);

  // 6. Click Provision Tenant
  await page.click('text=Provision Tenant');
  await expect(page).toHaveURL(/.*nexus\/tenants\/new/);

  // 7. Fill Tenant Details
  const tenantName = `Automated Hospital ${Date.now()}`;
  await page.fill('input[placeholder*="St. Mary"]', tenantName);
  await page.fill('input[placeholder*="st_marys_hims"]', `auto_hims_${Date.now()}`);
  await page.selectOption('select', 'Professional');

  // 8. Deploy
  await page.click('button:has-text("Deploy Tenant")');

  // 9. Verify Success & List Update
  // Note: App shows alert on success, we can handle it
  page.on('dialog', dialog => dialog.accept());
  
  await expect(page).toHaveURL(/.*nexus\/tenants/);
  await expect(page.locator('table')).toContainText(tenantName);
});
