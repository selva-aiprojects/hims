/**
 * Central Tenant Configuration for Regression Tests
 * ===================================================
 * Update ONLY this file when the active test tenant changes.
 * All test suites import from here — never hardcode tenant names inline.
 */

/** Primary tenant used for all regression tests (Professional plan — full feature access). */
export const TEST_TENANT = 'Apollo Hospitals - Professional Ltd';

/** Admin credentials valid across all tenant shards. */
export const ADMIN_EMAIL    = 'admin@hims-sys.com';
export const ADMIN_PASSWORD = 'Admin@123';
