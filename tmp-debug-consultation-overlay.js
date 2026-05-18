const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));

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

  const startOverlay = page.locator('text=Ready to Begin?');
  console.log('start overlay visible', await startOverlay.isVisible().catch(() => false));
  const startBtn = page.locator('button:has-text("START CONSULTATION NOW")').first();
  console.log('start btn count', await startBtn.count());
  await startBtn.click({ force: true });
  await page.waitForTimeout(2000);
  console.log('after start click overlay visible', await startOverlay.isVisible().catch(() => false));

  const diagnosis = page.locator('input').first();
  await diagnosis.fill('Viral Fever');
  await page.getByPlaceholder('Type clinical notes, observations, or chief complaints...').fill('Automated sidebar journey smoke note.');
  await page.waitForTimeout(1000);

  const buttonInfo = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('FINISH CONSULTATION'));
    if (!button) return { found: false };
    const rect = button.getBoundingClientRect();
    const checkPoints = [
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      { x: rect.left + 1, y: rect.top + 1 },
      { x: rect.right - 1, y: rect.bottom - 1 }
    ];
    const points = checkPoints.map(point => {
      const elements = document.elementsFromPoint(point.x, point.y).slice(0, 5).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent?.slice(0, 50) }));
      return { point, elements };
    });
    const pointerEvents = window.getComputedStyle(button).pointerEvents;
    const parentStyles = [];
    let el = button;
    while (el && el !== document.body) {
      parentStyles.push({ tag: el.tagName, class: el.className, pointerEvents: window.getComputedStyle(el).pointerEvents });
      el = el.parentElement;
    }
    return {
      found: true,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      pointerEvents,
      points,
      parentStyles
    };
  });
  console.log('buttonInfo', JSON.stringify(buttonInfo, null, 2));
  await page.screenshot({ path: 'debug-consultation.png', fullPage: true });

  await browser.close();
})();