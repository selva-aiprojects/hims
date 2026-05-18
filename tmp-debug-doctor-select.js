const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('response', async response => {
    if (response.url().includes('/api/hospital/doctors')) {
      console.log('RESPONSE', response.status(), response.url());
    }
  });

  await page.goto('http://127.0.0.1:4173/');
  await page.waitForSelector('label:has-text("Workspace Type")', { timeout: 20000 });
  await page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select').selectOption('tenant');
  await page.locator('label:has-text("Select Hospital")').locator('xpath=following-sibling::select').selectOption({ label: 'Apollo Hospitals - Professional Ltd' });
  await page.fill('input[type="email"]', 'admin@hims-sys.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("SIGN IN TO WORKSPACE")');

  await page.waitForSelector('.sidebar', { timeout: 20000 });
  await page.goto('http://127.0.0.1:4173/tenant/opd/registration');
  await page.waitForSelector('.doctor-card', { timeout: 20000 });
  await page.waitForTimeout(5000);
  const count = await page.locator('.doctor-card').count();
  console.log('doctor cards count:', count);
  for (let i = 0; i < count; i++) {
    const cl = await page.locator('.doctor-card').nth(i).getAttribute('class');
    const text = await page.locator('.doctor-card').nth(i).innerText();
    console.log(i, cl, text.slice(0, 70).replace(/\n/g, ' | '));
  }

  const firstDoctor = page.locator('.doctor-card').first();
  await firstDoctor.click();
  console.log('clicked first doctor');
  await page.waitForTimeout(1000);
  const newCount = await page.locator('.doctor-card').count();
  console.log('doctor cards count after click:', newCount);
  for (let i = 0; i < newCount; i++) {
    const cl = await page.locator('.doctor-card').nth(i).getAttribute('class');
    console.log('after', i, cl);
  }

  await browser.close();
})();