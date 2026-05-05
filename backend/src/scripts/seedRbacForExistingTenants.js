/**
 * Seed RBAC Tables for Existing Tenants
 * =====================================
 * This script ensures all existing tenants have proper RBAC tables and data
 */

const { getPrisma } = require('../config/prisma');
const fs = require('fs');
const path = require('path');

async function seedRbacForExistingTenants() {
  const prisma = getPrisma();
  
  try {
    console.log('🔧 Seeding RBAC data for existing tenants...\n');
    
    // Get all tenants
    const tenants = await prisma.$queryRaw`SELECT id, name, db_name FROM nexus.tenants WHERE is_active = true`;
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.db_name})`);
      
      try {
        // Read and execute the RBAC schema creation
        const schemaPath = path.join(__dirname, '../../database/SHARD_Base_Schema.sql');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Extract RBAC table creation statements
        const rbacStatements = [
          // RBAC Tables
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )`,
          
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_menus (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            label VARCHAR(100) NOT NULL,
            path VARCHAR(100) NOT NULL,
            icon VARCHAR(50),
            required_plan VARCHAR(50) DEFAULT 'basic',
            parent_id UUID REFERENCES "${tenant.db_name}".rbac_menus(id),
            sort_order INT DEFAULT 0
          )`,
          
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key VARCHAR(100) UNIQUE NOT NULL,
            description TEXT
          )`,
          
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_role_menus (
            role_id UUID REFERENCES "${tenant.db_name}".rbac_roles(id),
            menu_id UUID REFERENCES "${tenant.db_name}".rbac_menus(id),
            PRIMARY KEY (role_id, menu_id)
          )`,
          
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_role_permissions (
            role_id UUID REFERENCES "${tenant.db_name}".rbac_roles(id),
            permission_id UUID REFERENCES "${tenant.db_name}".rbac_permissions(id),
            PRIMARY KEY (role_id, permission_id)
          )`,
          
          `CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_user_roles (
            user_id UUID REFERENCES "${tenant.db_name}".users(id),
            role_id UUID REFERENCES "${tenant.db_name}".rbac_roles(id),
            PRIMARY KEY (user_id, role_id)
          )`
        ];
        
        // Execute RBAC table creation
        for (const statement of rbacStatements) {
          await prisma.$executeRawUnsafe(statement);
        }
        
        // Seed RBAC Roles
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.db_name}".rbac_roles (name, description) VALUES 
          ('ADMIN', 'Full system access with PII masking for audit purposes'),
          ('DOCTOR', 'Clinical access to full patient information for treatment'),
          ('NURSE', 'Clinical access to patient information for care delivery'),
          ('PHARMACIST', 'Access to pharmacy functions with masked patient PII'),
          ('LAB_ASSISTANT', 'Access to laboratory functions with masked patient PII'),
          ('RECEPTIONIST', 'Front desk access with limited patient PII'),
          ('SUPPORT', 'Administrative support with masked patient PII')
          ON CONFLICT (name) DO NOTHING
        `);
        
        // Seed RBAC Permissions
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.db_name}".rbac_permissions (key, description) VALUES
          ('PATIENT_PII_VIEW_FULL', 'Ability to view complete unmasked patient information'),
          ('PATIENT_PII_VIEW_MASKED', 'Ability to view masked patient information (limited PII)'),
          ('PATIENT_PII_VIEW_DEIDENTIFIED', 'Ability to view de-identified patient information only'),
          ('CLINICAL_ACCESS_FULL', 'Full clinical access including diagnosis, prescriptions, vitals'),
          ('CLINICAL_ACCESS_LIMITED', 'Limited clinical access with PII masking'),
          ('PHARMACY_ACCESS_FULL', 'Full pharmacy access including patient PII'),
          ('PHARMACY_ACCESS_MASKED', 'Pharmacy access with masked patient PII'),
          ('LAB_ACCESS_FULL', 'Full laboratory access including patient PII'),
          ('LAB_ACCESS_MASKED', 'Laboratory access with masked patient PII'),
          ('FRONT_DESK_ACCESS_FULL', 'Full front desk access including patient PII'),
          ('FRONT_DESK_ACCESS_MASKED', 'Front desk access with masked patient PII'),
          ('USER_MANAGE', 'Ability to manage user accounts and roles'),
          ('ROLE_MANAGE', 'Ability to manage role assignments and permissions'),
          ('SYSTEM_CONFIG', 'Ability to modify system settings and configurations'),
          ('AUDIT_VIEW', 'Ability to view audit logs and compliance reports'),
          ('DATA_EXPORT', 'Ability to export system data (with compliance checks)'),
          ('BILLING_ACCESS_FULL', 'Full access to billing and financial information'),
          ('BILLING_ACCESS_MASKED', 'Limited billing access with PII masking'),
          ('IPD_MANAGE', 'Ability to manage IPD admissions and bed assignments'),
          ('EMERGENCY_OVERRIDE', 'Ability to override access controls in emergency situations')
          ON CONFLICT (key) DO NOTHING
        `);
        
        // Link existing users to roles based on their legacy role field
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.db_name}".rbac_user_roles (user_id, role_id)
          SELECT u.id, r.id 
          FROM "${tenant.db_name}".users u
          JOIN "${tenant.db_name}".rbac_roles r ON LOWER(r.name) = LOWER(u.role)
          WHERE u.role IS NOT NULL AND u.role != ''
          ON CONFLICT (user_id, role_id) DO NOTHING
        `);
        
        console.log(`✅ RBAC tables created and seeded for ${tenant.name}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${tenant.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 RBAC seeding completed for all tenants!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRbacForExistingTenants();
}

module.exports = { seedRbacForExistingTenants };
