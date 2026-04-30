# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nexus_flow.spec.ts >> Nexus Admin Flow - Login and Tenant Provisioning
- Location: tests\nexus_flow.spec.ts:3:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*nexus\/tenants\/new/
Received string:  "http://localhost:3000/nexus/tenants"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:3000/nexus/tenants"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - heading "nexus" [level=3] [ref=e8]
      - navigation [ref=e9]:
        - link "Overview" [ref=e10] [cursor=pointer]:
          - /url: /nexus/dashboard
          - img [ref=e11]
          - generic [ref=e16]: Overview
        - link "Tenants" [ref=e17] [cursor=pointer]:
          - /url: /nexus/tenants
          - img [ref=e18]
          - generic [ref=e21]: Tenants
        - link "Super Admins" [ref=e22] [cursor=pointer]:
          - /url: /nexus/users
          - img [ref=e23]
          - generic [ref=e26]: Super Admins
        - link "System Logs" [ref=e27] [cursor=pointer]:
          - /url: /nexus/activity
          - img [ref=e28]
          - generic [ref=e30]: System Logs
        - link "Settings" [ref=e31] [cursor=pointer]:
          - /url: /nexus/settings
          - img [ref=e32]
          - generic [ref=e35]: Settings
        - link "Logout" [ref=e36] [cursor=pointer]:
          - /url: /
          - img [ref=e37]
          - generic [ref=e40]: Logout
      - generic [ref=e42]:
        - img [ref=e43]
        - generic [ref=e45]: Secure Node
    - main [ref=e46]:
      - generic [ref=e48]:
        - heading "Tenant Management" [level=1] [ref=e49]
        - paragraph [ref=e50]: Managing 0 active shards across the platform.
      - generic [ref=e51]:
        - generic [ref=e52]:
          - heading "Active Shards" [level=3] [ref=e53]
          - button "+ Provision Tenant" [active] [ref=e54] [cursor=pointer]
        - table [ref=e55]:
          - rowgroup [ref=e56]:
            - row "TENANT NAME SHARD ID PLAN STATUS ACTION" [ref=e57]:
              - columnheader "TENANT NAME" [ref=e58]
              - columnheader "SHARD ID" [ref=e59]
              - columnheader "PLAN" [ref=e60]
              - columnheader "STATUS" [ref=e61]
              - columnheader "ACTION" [ref=e62]
          - rowgroup [ref=e63]:
            - row "No tenants provisioned yet." [ref=e64]:
              - cell "No tenants provisioned yet." [ref=e65]
  - alert [ref=e66]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Nexus Admin Flow - Login and Tenant Provisioning', async ({ page }) => {
  4  |   // 1. Navigate to Login
  5  |   await page.goto('http://localhost:3000');
  6  |   
  7  |   // 2. Select Nexus Facility
  8  |   await page.selectOption('select', 'nexus');
  9  |   
  10 |   // 3. Login
  11 |   // Note: Placeholders match the redesigned UI
  12 |   await page.fill('input[placeholder="admin@ehs.com"]', 'admin@hmis-sys.com');
  13 |   await page.fill('input[placeholder="••••••••••••"]', 'Admin@123');
  14 |   await page.click('button:has-text("SIGN IN TO WORKSPACE")');
  15 | 
  16 |   // 4. Verify Dashboard Redirect
  17 |   await expect(page).toHaveURL(/.*nexus\/dashboard/);
  18 |   await expect(page.locator('h1')).toContainText('Nexus Control Plane');
  19 | 
  20 |   // 5. Navigate to Tenants
  21 |   await page.click('text=Tenants');
  22 |   await expect(page).toHaveURL(/.*nexus\/tenants/);
  23 | 
  24 |   // 6. Click Provision Tenant
  25 |   const provisionBtn = page.locator('button:has-text("Provision Tenant")');
  26 |   await provisionBtn.waitFor({ state: 'visible' });
  27 |   await provisionBtn.click();
  28 |   
  29 |   // 7. Verify Navigation to Creation Page
> 30 |   await expect(page).toHaveURL(/.*nexus\/tenants\/new/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  31 | 
  32 |   // 8. Fill Tenant Details
  33 |   const tenantName = `Automated Hospital ${Date.now()}`;
  34 |   await page.fill('input[placeholder*="St. Mary"]', tenantName);
  35 |   await page.fill('input[placeholder*="st_marys_hims"]', `auto_hims_${Date.now()}`);
  36 |   await page.selectOption('select', 'Professional');
  37 | 
  38 |   // 9. Deploy
  39 |   // Handle success alert
  40 |   page.on('dialog', async dialog => {
  41 |     console.log(`Dialog message: ${dialog.message()}`);
  42 |     await dialog.accept();
  43 |   });
  44 |   
  45 |   await page.click('button:has-text("Deploy Tenant")');
  46 | 
  47 |   // 10. Verify Success & List Update
  48 |   await expect(page).toHaveURL(/.*nexus\/tenants/);
  49 |   await expect(page.locator('table')).toContainText(tenantName);
  50 | });
  51 | 
```