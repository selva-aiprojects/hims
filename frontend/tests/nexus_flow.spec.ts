import { test, expect } from '@playwright/test';

test('Nexus Admin Flow - Login and Tenant Provisioning', async ({ page }) => {
  // 1. Navigate to Login
  await page.goto('http://localhost:3000');
  
  // 2. Select Nexus Facility
  await page.selectOption('select', 'nexus');
  
  // 3. Login
  // Note: Placeholders match the redesigned UI
  await page.fill('input[placeholder="admin@ehs.com"]', 'admin@hmis-sys.com');
  await page.fill('input[placeholder="••••••••••••"]', 'Admin@123');
  await page.click('button:has-text("SIGN IN TO WORKSPACE")');

  // 4. Verify Dashboard Redirect
  await expect(page).toHaveURL(/.*nexus\/dashboard/);
  await expect(page.locator('h1')).toContainText('Nexus Control Plane');

  // 5. Navigate to Tenants
  await page.click('text=Tenants');
  await expect(page).toHaveURL(/.*nexus\/tenants/);

  // 6. Click Provision Tenant
  const provisionBtn = page.locator('button:has-text("Provision Tenant")');
  await provisionBtn.waitFor({ state: 'visible' });
  await provisionBtn.click();
  
  // 7. Verify Navigation to Creation Page
  await expect(page).toHaveURL(/.*nexus\/tenants\/new/);

  // 8. Fill Tenant Details
  const tenantName = `Automated Hospital ${Date.now()}`;
  await page.fill('input[placeholder*="St. Mary"]', tenantName);
  await page.fill('input[placeholder*="st_marys_hims"]', `auto_hims_${Date.now()}`);
  await page.selectOption('select', 'Professional');

  // 9. Deploy
  // Handle success alert
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });
  
  await page.click('button:has-text("Deploy Tenant")');

  // 10. Verify Success & List Update
  await expect(page).toHaveURL(/.*nexus\/tenants/);
  await expect(page.locator('table')).toContainText(tenantName);
});
