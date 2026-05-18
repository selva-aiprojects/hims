const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForSelector('label:has-text("Workspace Type")', { timeout: 20000 });
  await page.locator('label:has-text("Workspace Type")').locator('xpath=following-sibling::select').selectOption('tenant');
  await page.locator('label:has-text("Select Hospital")').locator('xpath=following-sibling::select').selectOption({ label: 'Apollo Hospitals - Professional Ltd' });
  await page.fill('input[type="email"]', 'admin@hims-sys.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("SIGN IN TO WORKSPACE")');
  await page.waitForSelector('.sidebar', { timeout: 20000 });
  await page.goto('http://127.0.0.1:4173/tenant/opd/queue');
  await page.waitForSelector('tr', { timeout: 20000 });
  const patientRow = page.locator('tr', { hasText: 'Flow Test' }).first();
  await patientRow.scrollIntoViewIfNeeded();
  await patientRow.getByRole('button', { name: /Start Consult/i }).click();
  await page.waitForURL(/tenant\/opd\/consultation/, { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('url before overlay click', page.url());
  const startBtn = page.locator('button:has-text("START CONSULTATION NOW")').first();
  console.log('startBtn count', await startBtn.count());
  await startBtn.click({ force: true });
  await page.waitForTimeout(2000);
  console.log('url after overlay click', page.url());
  await page.screenshot({ path: 'debug-consultation-button.png', fullPage: true });
  const info = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('FINISH CONSULTATION'));
    if (!button) return 'missing';
    const parent = button.parentElement;
    const grandParent = parent?.parentElement;
    return {
      buttonOuter: button.outerHTML.slice(0, 2000),
      parentOuter: parent?.outerHTML.slice(0, 2000),
      grandParentOuter: grandParent?.outerHTML.slice(0, 2000),
      buttonRect: button.getBoundingClientRect().toJSON(),
      buttonStyle: window.getComputedStyle(button).cssText,
      parentStyle: parent ? window.getComputedStyle(parent).cssText : null,
      grandParentStyle: grandParent ? window.getComputedStyle(grandParent).cssText : null,
      point35: {
        x: button.getBoundingClientRect().left + 1,
        y: button.getBoundingClientRect().top + 1,
        elements: document.elementsFromPoint(button.getBoundingClientRect().left + 1, button.getBoundingClientRect().top + 1).slice(0, 5).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent?.slice(0, 50) }))
      }
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
