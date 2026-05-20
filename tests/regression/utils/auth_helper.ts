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
    
    await this.page.evaluate(() => {
      localStorage.setItem('isAutomation', 'true');
    });

    const workspaceSelect = this.page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select');
    await expect(workspaceSelect).toHaveCount(1);
    await workspaceSelect.selectOption('tenant');

    const tenantSelect = this.page.locator('label:has-text("Select Hospital")').locator('xpath=following-sibling::select');
    await expect(tenantSelect).toHaveCount(1);
    // Wait for the option to be populated (async fetch from backend)
    await this.page.waitForFunction(
      (name) => {
        const selects = document.querySelectorAll('select');
        for (const sel of selects) {
          for (const opt of sel.options) {
            if (opt.text.includes(name)) return true;
          }
        }
        return false;
      },
      tenantName,
      { timeout: 15000 }
    );
    await expect(tenantSelect.locator(`option:has-text("${tenantName}")`)).toBeAttached({ timeout: 5000 });
    await tenantSelect.selectOption({ label: tenantName });

    await this.page.fill('input[type="email"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("SIGN IN TO WORKSPACE")');

    await this.page.waitForSelector('.sidebar', { timeout: 15000 });
    await expect(this.page.locator('.sidebar')).toBeVisible();
  }

  /**
   * Navigates to a sidebar item, expanding its parent group if necessary.
   */
  async navigateToSidebar(label: string) {
    const sidebar = this.page.locator('.sidebar');
    
    // Target the link directly using a substring match to avoid strict Regex edge cases with React JSX whitespace
    const item = sidebar.locator('a.nav-item').filter({ hasText: label }).first();
    
    // Try to click directly. If it fails (hidden), we catch and open the group.
    try {
      await item.waitFor({ state: 'visible', timeout: 2000 });
      await item.click();
    } catch (e) {
      const groups = ['Clinical Operations', 'Diagnostic Services', 'Finance & Revenue', 'System Administration'];
      for (const group of groups) {
        const groupBtn = sidebar.locator('button').filter({ hasText: group });
        if (await groupBtn.isVisible()) {
          await groupBtn.click();
          try {
            await item.waitFor({ state: 'visible', timeout: 1000 });
            await this.page.waitForTimeout(300); // Let layout settle
            break;
          } catch (e) {
            await groupBtn.click();
            await this.page.waitForTimeout(300);
          }
        }
      }

      if (await item.count() === 0 || !(await item.isVisible())) {
        console.log('--- SIDEBAR HTML DUMP ---');
        const html = await sidebar.evaluate(node => node.innerHTML);
        console.log(html.substring(0, 5000));
        console.log('-------------------------');
        throw new Error(`CRITICAL: Sidebar item '${label}' NOT FOUND IN DOM AFTER EXPANDING GROUPS!`);
      }

      await item.scrollIntoViewIfNeeded();
      await item.evaluate(node => node.click());
    }
    
  }
}
