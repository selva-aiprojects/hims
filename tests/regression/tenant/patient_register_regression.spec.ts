import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth_helper';

test.describe('Patient Register & Archives Regression Tests', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    // Logging into a known tenant shard
    await auth.loginTenant('Millenium Hospitals Group of Companies Ltd');
  });

  test('Navigate to Patient Register and Search', async ({ page }) => {
    // 1. Navigate to Patient Register
    await auth.navigateToSidebar('Patient Register');
    await expect(page).toHaveURL(/.*clinical\/patient-register/);

    // 2. Verify search components are visible
    const searchBar = page.getByPlaceholder('Search by Patient Name, MRN, or Phone Number...');
    await expect(searchBar).toBeVisible();

    // 3. Perform a search query
    await searchBar.fill('Test');
    await page.getByRole('button', { name: 'Search' }).click();

    // 4. Verify table headers are correct
    await expect(page.getByText('PATIENT ID (MRN)')).toBeVisible();
    await expect(page.getByText('PATIENT NAME')).toBeVisible();
    await expect(page.getByText('PHONE NUMBER')).toBeVisible();
    await expect(page.getByText('PATIENT HISTORY')).toBeVisible();
    await expect(page.getByText('PRIMARY DOCTOR')).toBeVisible();
    await expect(page.getByText('LAST VISITED DATE')).toBeVisible();
  });

  test('Patient Profile Modal and Appointment Booking Redirection', async ({ page }) => {
    // 1. Navigate to Patient Register
    await auth.navigateToSidebar('Patient Register');
    await expect(page).toHaveURL(/.*clinical\/patient-register/);

    // Wait for the table to load at least one row
    const viewButtons = page.getByRole('button', { name: 'View Profile' });
    
    // Check if we have any patient records. If not, register one first, then check.
    const recordCount = await viewButtons.count();
    if (recordCount === 0) {
      // Register a mock patient first
      await auth.navigateToSidebar('OPD Center');
      const patientName = `Archived Patient ${Date.now()}`;
      await page.getByPlaceholder('Type Phone, Name or MRN to begin...').fill(patientName);
      await page.waitForTimeout(1000);
      await page.locator('label:has-text("Phone Number")').locator('xpath=following-sibling::input').fill('9555123456');
      
      const firstDoctor = page.locator('button').filter({ hasText: /Dr\./ }).first();
      await expect(firstDoctor).toBeVisible();
      await firstDoctor.click();
      
      await page.getByRole('button', { name: /FINALIZE & ISSUE TOKEN/i }).click();
      await expect(page.locator('.app-toast-success')).toBeVisible({ timeout: 10000 });

      // Navigate back to Patient Register
      await auth.navigateToSidebar('Patient Register');
      await expect(page).toHaveURL(/.*clinical\/patient-register/);
      
      await page.getByPlaceholder('Search by Patient Name, MRN, or Phone Number...').fill(patientName);
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForTimeout(1000);
    }

    // Click "View Profile" for the first patient
    await viewButtons.first().click();

    // 2. Verify Modal elements
    await expect(page.getByText('Patient Dossier')).toBeVisible();
    await expect(page.getByText('Personal Demographics')).toBeVisible();
    await expect(page.getByText('Emergency contact & Guardian')).toBeVisible();
    await expect(page.getByText('Clinical Profile')).toBeVisible();

    // Close the Modal
    await page.getByRole('button', { name: 'Close Dossier' }).click();
    await expect(page.getByText('Patient Dossier')).not.toBeVisible();

    // 3. Verify "Book Appt" navigates correctly with preselected patientId
    const bookButtons = page.getByRole('button', { name: 'Book Appt' });
    await expect(bookButtons.first()).toBeVisible();
    await bookButtons.first().click();

    // Verify redirected page is the Book Appointment page and contains preselected indicator (skips doctor/patient select transition)
    await expect(page).toHaveURL(/.*appointments\/book\?patientId=.+/);
  });
});
