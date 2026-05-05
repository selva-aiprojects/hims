const express = require("express");
const router = express.Router();

/**
 * Hospital Metrics & Analytics Engine
 * Provides shard-isolated REAL-TIME data for dashboards.
 */
router.get("/stats", async (req, res, next) => {
  try {
    const schema = req.schemaName;

    // 1. CORE KPIs (LIVE)
    const [patientCount, admissionCount, billCount, revenue] = await Promise.all([
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${schema}".patients WHERE created_at > NOW() - INTERVAL '24 hours'`),
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${schema}".ipd_admissions WHERE status = 'Active'`),
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${schema}".invoices WHERE status = 'Unpaid'`),
      req.prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(total), 0)::float FROM "${schema}".invoices WHERE status = 'Paid' AND created_at > NOW() - INTERVAL '24 hours'`)
    ]);

    // 2. IP vs OP Ratio (Last 30 Days)
    const ipOpRatio = await req.prisma.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*)::int FROM "${schema}".appointments WHERE created_at > NOW() - INTERVAL '30 days') as op_count,
        (SELECT COUNT(*)::int FROM "${schema}".ipd_admissions WHERE admitted_at > NOW() - INTERVAL '30 days') as ip_count
    `);

    // 3. Pharmacy Stock Alerts (Critical < 20 units)
    const stockAlerts = await req.prisma.$queryRawUnsafe(`
      SELECT name, stock_quantity 
      FROM "${schema}".medicines 
      WHERE stock_quantity < 20 AND is_active = true 
      ORDER BY stock_quantity ASC LIMIT 5
    `);

    // 4. Bed Occupancy (Live)
    const bedStats = await req.prisma.$queryRawUnsafe(`
      SELECT 
        status, 
        COUNT(*)::int as count 
      FROM "${schema}".beds 
      GROUP BY status
    `);

    // 5. Lab Performance (Pending vs Completed)
    const labStats = await req.prisma.$queryRawUnsafe(`
      SELECT 
        status, 
        COUNT(*)::int as count 
      FROM "${schema}".lab_orders 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY status
    `);

    // 6. Discharge Comparison (Admissions vs Discharges last 7 days)
    const dischargeTrend = await req.prisma.$queryRawUnsafe(`
      SELECT 
        d.date::date as date,
        (SELECT COUNT(*)::int FROM "${schema}".ipd_admissions WHERE admitted_at::date = d.date::date) as admitted,
        (SELECT COUNT(*)::int FROM "${schema}".ipd_admissions WHERE discharged_at::date = d.date::date) as discharged
      FROM (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as date
      ) d
      ORDER BY d.date ASC
    `);

    // 7. Weekly Patient Flow (Original)
    const weeklyFlow = await req.prisma.$queryRawUnsafe(`
      SELECT 
        d.date::date as date,
        COALESCE(count(p.id), 0)::int as count
      FROM (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as date
      ) d
      LEFT JOIN "${schema}".patients p ON p.created_at::date = d.date::date
      GROUP BY d.date
      ORDER BY d.date ASC
    `);

    // 8. Latest Patient
    const lastPatientRes = await req.prisma.$queryRawUnsafe(`SELECT name FROM "${schema}".patients ORDER BY created_at DESC LIMIT 1`);

    res.json({
      metrics: {
        patientInflow: patientCount[0]?.count || 0,
        activeAdmissions: admissionCount[0]?.count || 0,
        pendingBills: billCount[0]?.count || 0,
        dailyRevenue: revenue[0]?.sum || 0,
        lastPatient: lastPatientRes[0]?.name || 'N/A'
      },
      ipOpRatio: ipOpRatio[0],
      stockAlerts,
      bedStats,
      labStats,
      dischargeTrend,
      weeklyFlow
    });
  } catch (error) { 
    console.error("[METRICS ERROR]", error);
    res.status(500).json({ error: "Failed to fetch real-time clinical metrics" });
  }
});

module.exports = router;
