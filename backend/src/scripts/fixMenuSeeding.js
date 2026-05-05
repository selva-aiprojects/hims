/**
 * Fix Menu Seeding for Current Tenant
 * ==================================
 * This script manually triggers RBAC menu seeding for debugging
 */

const { getPrisma } = require('../config/prisma');

async function fixMenuSeeding() {
  const prisma = getPrisma();
  
  try {
    console.log('🔧 Fixing menu seeding for current tenant...\n');
    
    // Get all active tenants
    const tenants = await prisma.$queryRaw`SELECT id, name, db_name FROM nexus.tenants WHERE is_active = true`;
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.db_name})`);
      
      try {
        // Manually run the menu seeding logic
        await prisma.$executeRawUnsafe(`
          -- Create tables if they don't exist
          CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_roles (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name VARCHAR(50) UNIQUE NOT NULL,
              description TEXT,
              created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_menus (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              label VARCHAR(100) NOT NULL,
              path VARCHAR(100) NOT NULL,
              icon VARCHAR(50),
              required_plan VARCHAR(50) DEFAULT 'basic',
              parent_id UUID REFERENCES "${tenant.db_name}".rbac_menus(id),
              sort_order INT DEFAULT 0
          );
          
          CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_permissions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              key VARCHAR(100) UNIQUE NOT NULL,
              description TEXT
          );
          
          CREATE TABLE IF NOT EXISTS "${tenant.db_name}".rbac_role_menus (
              role_id UUID REFERENCES "${tenant.db_name}".rbac_roles(id),
              menu_id UUID REFERENCES "${tenant.db_name}".rbac_menus(id),
              PRIMARY KEY (role_id, menu_id)
          );
        `);
        
        // Seed roles
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
        
        // Seed menus including Doctor Calendar
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.db_name}".rbac_menus (label, path, icon, required_plan, sort_order) VALUES
          ('OPD Registration', '/tenant/opd/registration', 'UserPlus', 'basic', 1),
          ('OPD Queue', '/tenant/opd/queue', 'Users', 'basic', 2),
          ('Doctor''s Queue', '/tenant/opd/doctor-queue', 'Activity', 'basic', 3),
          ('Consultation Desk', '/tenant/opd/consultation', 'Stethoscope', 'basic', 4),
          ('Appointment List', '/tenant/appointments', 'Calendar', 'basic', 5),
          ('Doctor Calendar', '/tenant/appointments/doctor-calendar', 'Calendar', 'basic', 6),
          ('Admission Desk', '/tenant/ipd/admission-desk', 'Building', 'basic', 7),
          ('IPD Bed Map', '/tenant/ipd/beds', 'Map', 'basic', 8),
          ('Laboratory', '/tenant/lab', 'FlaskConical', 'standard', 9),
          ('Pharmacy Dashboard', '/tenant/pharmacy/dashboard', 'Pill', 'standard', 10),
          ('Stock Inventory', '/tenant/pharmacy/inventory', 'Package', 'standard', 11),
          ('Prescription Queue', '/tenant/pharmacy/queue', 'Receipt', 'standard', 12),
          ('Staff & RBAC', '/tenant/staff', 'Users', 'professional', 13),
          ('Hospital Settings', '/tenant/masters', 'Settings', 'professional', 14),
          ('Help & Support', '/tenant/support', 'HelpCircle', 'basic', 15),
          ('Ticketing Management System', '/tenant/support/tickets', 'Ticket', 'basic', 16)
          ON CONFLICT (label) DO NOTHING
        `);
        
        // Link roles to menus
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.db_name}".rbac_role_menus (role_id, menu_id)
          SELECT r.id, m.id 
          FROM "${tenant.db_name}".rbac_roles r
          CROSS JOIN "${tenant.db_name}".rbac_menus m
          WHERE r.name IN ('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')
          AND m.label IN (
            'OPD Registration', 'OPD Queue', 'Doctor''s Queue', 'Consultation Desk', 
            'Appointment List', 'Doctor Calendar', 'Admission Desk', 'IPD Bed Map',
            'Laboratory', 'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue',
            'Staff & RBAC', 'Hospital Settings', 'Help & Support', 'Ticketing Management System'
          )
          ON CONFLICT (role_id, menu_id) DO NOTHING
        `);
        
        // Check what menus exist now
        const menus = await prisma.$queryRawUnsafe(`
          SELECT label, path, sort_order FROM "${tenant.db_name}".rbac_menus 
          ORDER BY sort_order ASC
        `);
        
        console.log(`✅ Menus seeded for ${tenant.name}:`);
        menus.forEach(menu => {
          console.log(`   ${menu.sort_order}. ${menu.label} → ${menu.path}`);
        });
        
      } catch (error) {
        console.error(`❌ Error processing ${tenant.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Menu seeding completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Clear your browser localStorage');
    console.log('2. Logout and login again');
    console.log('3. Check sidebar for "Doctor Calendar"');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixMenuSeeding();
}

module.exports = { fixMenuSeeding };
