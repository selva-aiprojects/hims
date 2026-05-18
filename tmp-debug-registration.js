const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', request => {
    if (request.url().includes('/api/')) console.log('REQUEST', request.method(), request.url());
  });
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      const status = response.status();
      const url = response.url();
      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = '<no body>';
      }
      console.log('RESPONSE', status, url, body.slice(0, 200));
    }
  });
  page.on('console', msg => console.log('PAGE:', msg.text()));

  await page.goto('http://127.0.0.1:4173/');
  await page.waitForSelector('label:has-text("Workspace Type")', { timeout: 20000 });
  await page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select').selectOption('tenant');
  await page.locator('label:has-text("Select Hospital")').locator('xpath=following-sibling::select').selectOption({ label: 'Apollo Hospitals - Professional Ltd' });
  await page.fill('input[type="email"]', 'admin@hims-sys.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("SIGN IN TO WORKSPACE")');

  await page.waitForSelector('.sidebar', { timeout: 20000 });
  console.log('Logged in');

  const sidebar = page.locator('.sidebar');
  const navigateToSidebar = async (label) => {
    const item = sidebar.locator('a.nav-item').filter({ hasText: label }).first();
    try {
      await item.click({ timeout: 5000 });
      return;
    } catch (error) {
      const groups = ['Clinical Operations', 'Diagnostic Services', 'Finance & Revenue', 'System Administration'];
      for (const group of groups) {
        const groupBtn = sidebar.locator('button').filter({ hasText: group }).first();
        if (await groupBtn.count() === 0) continue;
        await groupBtn.click();
        try {
          await item.waitFor({ state: 'visible', timeout: 2000 });
          await item.click();
          return;
        } catch (e) {
          // keep trying other groups
        }
      }
      throw new Error(`Sidebar label '${label}' not clickable.`);
    }
  };

  await navigateToSidebar('OPD Center');
  await page.waitForURL(/tenant\/opd\/registration/, { timeout: 20000 });
  await page.waitForSelector('button:has-text("FINALIZE & ISSUE TOKEN")', { timeout: 10000 });

  const patientName = `Flow Test ${Date.now()}`;
  await page.fill('input[placeholder="Type Phone, Name or MRN to begin..."]', patientName);
  await page.waitForTimeout(2000);
  await page.waitForSelector('text=NEW PATIENT PROFILE', { timeout: 10000 });
  const fullName = page.locator('label:has-text("Full Name")').locator('xpath=following-sibling::input');
  const phoneNumber = page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input');
  const dateOfBirth = page.locator('label:has-text("Date of Birth")').locator('xpath=following-sibling::input');
  const bloodGroup = page.locator('label:has-text("Blood Group")').locator('xpath=following-sibling::select');
  const occupation = page.locator('label:has-text("Occupation")').locator('xpath=following-sibling::input');
  const weight = page.locator('label:has-text("Weight")').locator('xpath=following-sibling::input');
  const bp = page.locator('label:has-text("BP")').locator('xpath=following-sibling::input');
  const temp = page.locator('label:has-text("Temp")').locator('xpath=following-sibling::input');
  const height = page.locator('label:has-text("Height")').locator('xpath=following-sibling::input');

  await fullName.fill(patientName);
  await phoneNumber.fill(`9${Date.now().toString().slice(-9)}`);
  await dateOfBirth.fill('1990-01-15');
  await bloodGroup.selectOption('O+');
  await occupation.fill('QA');
  await weight.fill('70');
  await bp.fill('120/80');
  await temp.fill('98.6');
  await height.fill('172');

  const firstDoctor = page.locator('.doctor-card').first();
  await firstDoctor.waitFor({ timeout: 10000 });
  await firstDoctor.click();
  console.log('Doctor selected');

  await page.click('button:has-text("FINALIZE & ISSUE TOKEN")');
  console.log('Finalize clicked');

  try {
    await page.waitForSelector('.app-toast-success', { timeout: 15000 });
    console.log('Success toast visible');
  } catch (e) {
    console.log('No success toast');
    const toastText = await page.locator('.app-toast').allTextContents();
    console.log('Toasts:', toastText);
    const body = await page.locator('body').innerText();
    console.log('Body snapshot length:', body.length);
  }

  await browser.close();
})();