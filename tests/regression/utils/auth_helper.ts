import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async loginNexus(username = 'admin@hims-sys.com', password = 'Admin@123') {
    await this.page.goto('/');
    await this.page.waitForSelector('label:has-text("Workspace Type")', { timeout: 10000 });

    const workspaceSelect = this.page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select');
    await expect(workspaceSelect).toHaveCount(1);
    await workspaceSelect.selectOption('nexus');

    await this.page.fill('input[type="email"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("SIGN IN TO WORKSPACE")');

    await this.page.waitForURL(/.*nexus\/.*/, { timeout: 15000 });
    await this.page.waitForSelector('.sidebar', { timeout: 15000 });
    await expect(this.page.locator('.sidebar')).toBeVisible();
  }

  async loginTenant(tenantName: string, username = 'admin@hims-sys.com', password = 'Admin@123') {
    await this.page.goto('/');
    await this.page.waitForSelector('label:has-text("Workspace Type")', { timeout: 10000 });

    const workspaceSelect = this.page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select');
    await expect(workspaceSelect).toHaveCount(1);
    await workspaceSelect.selectOption('tenant');

    const tenantSelect = this.page.locator('label:has-text("Select Hospital")').locator('xpath=following-sibling::select');
    await expect(tenantSelect).toHaveCount(1);
    await expect(tenantSelect.locator(`option:has-text("${tenantName}")`)).toBeAttached({ timeout: 10000 });
    await tenantSelect.selectOption({ label: tenantName });

    await this.page.fill('input[type="email"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("SIGN IN TO WORKSPACE")');

    await this.page.waitForSelector('.sidebar', { timeout: 15000 });
    await expect(this.page.locator('.sidebar')).toBeVisible();
  }
}
