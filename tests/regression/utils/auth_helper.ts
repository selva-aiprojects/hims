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
    await this.page.evaluate(() => {
      localStorage.setItem('isAutomation', 'true');
    });
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('.sidebar')).toBeVisible();
  }

  /**
   * Navigates to a sidebar item, expanding its parent group if necessary.
   */
  async navigateToSidebar(label: string) {
    const sidebar = this.page.locator('.sidebar');
    
    // Target the link directly using exact name for reliability, using .first() to avoid strict mode violations
    const item = sidebar.getByRole('link', { name: label, exact: true }).first();
    
    // Try to click directly. If it fails (hidden), we catch and open the group.
    try {
      await item.waitFor({ state: 'visible', timeout: 2000 });
      await item.click();
    } catch (e) {
      // It's hidden (likely in a collapsed group). Let's expand groups.
      const groups = ['Clinical Operations', 'Diagnostic Services', 'Finance & Revenue', 'System Administration'];
      for (const group of groups) {
        const groupBtn = sidebar.locator('button').filter({ hasText: group });
        if (await groupBtn.isVisible()) {
          // Open the group
          await groupBtn.click();
          await this.page.waitForTimeout(500); // Wait for CSS transition
          
          if (await item.isVisible()) {
            break; // Found our item!
          } else {
            // Not in this group, close it back
            await groupBtn.click();
            await this.page.waitForTimeout(300);
          }
        }
      }
      
      // Now it must be visible. Force click to bypass any pointer-events interception by parent scroll containers.
      await item.scrollIntoViewIfNeeded();
      await item.click({ force: true });
    }
    
    await this.page.waitForLoadState('networkidle');
  }
}
