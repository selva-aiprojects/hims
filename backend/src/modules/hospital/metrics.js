const express = require("express");
const router = express.Router();

/**
 * Hospital Metrics & Analytics Engine
 * Provides shard-isolated REAL-TIME data for dashboards.
 */
router.get("/stats", async (req, res, next) => {
  try {
    const schema = req.schemaName;
    
    // Schema Guard: Ensure predictive analytics tables exist
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".consultation_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id UUID,
        predicted_time_mins INTEGER,
        complexity VARCHAR(50),
        triage_priority INTEGER,
        reasoning TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schema}".consultation_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id UUID,
        event_type VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 1. CORE KPIs (LIVE)
    const [patientCount, admissionCount, billCount, revenue] = await Promise.all([
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${schema}".patients WHERE created_at > NOW() - INTERVAL '24 hours'`),
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${schema}".ipd_admissions WHERE status = 'Admitted'`),

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

    // 9. PREDICTIVE ANALYTICS (REAL)
    // 9.1 Complexity Mix from AI Predictions
    const complexityResults = await req.prisma.$queryRawUnsafe(`
      SELECT complexity as name, COUNT(*)::int as count 
      FROM "${schema}".consultation_predictions 
      GROUP BY complexity
    `);
    const totalComplexity = complexityResults.reduce((acc, c) => acc + c.count, 0) || 1;
    const complexityMix = complexityResults.map(c => ({
      name: c.name,
      value: Math.round((c.count / totalComplexity) * 100)
    }));

    // 9.2 Predicted vs Actual (Accuracy Tracker)
    // Fetch last 10 completed consultations
    const accuracyStats = await req.prisma.$queryRawUnsafe(`
      SELECT 
        cp.predicted_time_mins as predicted,
        COALESCE(NULLIF(ce.metadata->>'totalDuration', '')::float, 0) / 60 as actual,
        e.created_at as time
      FROM "${schema}".consultation_predictions cp
      JOIN "${schema}".consultation_events ce ON ce.encounter_id = cp.encounter_id AND ce.event_type = 'CONSULT_END'
      JOIN "${schema}".encounters e ON e.id = cp.encounter_id
      ORDER BY e.created_at DESC
      LIMIT 10
    `);

    // 9.3 Avg Predicted Time
    const avgPredictedRes = await req.prisma.$queryRawUnsafe(`SELECT AVG(predicted_time_mins)::float FROM "${schema}".consultation_predictions`);

    // 9.4 Physician Utilization (Last 24h)
    const utilizationRes = await req.prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(SUM(NULLIF(metadata->>'totalDuration', '')::float), 0) / 3600 as active_hours
      FROM "${schema}".consultation_events 
      WHERE event_type = 'CONSULT_END' AND created_at > NOW() - INTERVAL '24 hours'
    `);
    const activeHours = utilizationRes[0]?.active_hours || 0;
    const utilizationPercent = Math.min(100, Math.round((activeHours / 8) * 100)); // Assuming 8h shift for index

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
      weeklyFlow,
      totalBeds: bedStats.reduce((acc, b) => acc + (b.count || 0), 0) || 49,
      predictive: {
        complexityMix: complexityMix.length ? complexityMix : [{ name: 'Routine', value: 100 }],
        predictedAvgTime: Math.round(avgPredictedRes[0]?.avg || 15),
        utilization: utilizationPercent,
        workloadForecast: (accuracyStats || []).map(s => ({
          time: s.time ? new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          actual: Math.round(Number(s.actual) || 0),
          predicted: Number(s.predicted) || 0
        })).reverse()
      }
    });

  } catch (error) { 
    console.error("[METRICS ERROR]", error);
    res.status(500).json({ error: "Failed to fetch real-time clinical metrics" });
  }
});

/**
 * CLINICAL COMMAND OVERVIEW
 * High-velocity operational intelligence for hospital management.
 */
router.get("/clinical-command-overview", async (req, res, next) => {
  try {
    const schema = req.schemaName;

    // Schema Healing: Ensure operational tables exist before querying
    await req.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".doctor_status (
        doctor_id UUID PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        delay_minutes INTEGER DEFAULT 0,
        current_location VARCHAR(100),
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);

    // 1. Top Metrics (Last 24 Hours)
    const [consultations, waitTime, emergencies, revenue] = await Promise.all([
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${schema}".encounters WHERE created_at > NOW() - INTERVAL '24 hours'`),
      req.prisma.$queryRawUnsafe(`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (e.created_at - a.appointment_time))/60), 0)::int as avg_wait
        FROM "${schema}".encounters e
        JOIN "${schema}".appointments a ON e.patient_id = a.patient_id 
        WHERE e.created_at > NOW() - INTERVAL '24 hours'
      `),
      req.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${schema}".doctor_status WHERE status = 'EMERGENCY'`),
      req.prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(unit_price * quantity), 0)::float as sum FROM "${schema}".billing_queue WHERE created_at > NOW() - INTERVAL '24 hours'`)
    ]);

    // 2. Patient Inflow Trend (Today by Hour)
    const inflowTrend = await req.prisma.$queryRawUnsafe(`
      SELECT 
        h.hour || ':00' as time,
        COALESCE(COUNT(e.id), 0)::int as count
      FROM (
        SELECT generate_series(0, 23) as hour
      ) h
      LEFT JOIN "${schema}".encounters e ON EXTRACT(HOUR FROM e.created_at) = h.hour AND e.created_at > CURRENT_DATE
      GROUP BY h.hour
      ORDER BY h.hour ASC
    `);

    // 3. Departmental Delay Index
    const delayIndex = await req.prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(u.department, 'General') as name, 
        AVG(ds.delay_minutes)::int as value
      FROM "${schema}".doctor_status ds
      JOIN "${schema}".users u ON ds.doctor_id = u.id
      GROUP BY u.department
      LIMIT 5
    `);

    // 4. Capacity Gauge
    const capacity = await req.prisma.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*)::int FROM "${schema}".beds WHERE status = 'Occupied') as occupied,
        (SELECT COUNT(*)::int FROM "${schema}".beds) as total
    `);

    // 5. Operational Intelligence Feed (Recent State Changes)
    const feed = await req.prisma.$queryRawUnsafe(`
      (SELECT 'emergency' as type, 'Emergency Mode' as title, u.name || ' activated emergency.' as desc, ds.last_updated as time
       FROM "${schema}".doctor_status ds JOIN "${schema}".users u ON ds.doctor_id = u.id WHERE ds.status = 'EMERGENCY' LIMIT 3)
      UNION ALL
      (SELECT 'delay' as type, 'Physician Delay' as title, u.name || ' is running ' || ds.delay_minutes || 'm late.' as desc, ds.last_updated as time
       FROM "${schema}".doctor_status ds JOIN "${schema}".users u ON ds.doctor_id = u.id WHERE ds.delay_minutes > 0 LIMIT 3)
      ORDER BY time DESC
      LIMIT 10
    `);

    res.json({
      metrics: {
        consultations: consultations[0].count,
        waitTime: waitTime[0].avg_wait,
        emergencies: emergencies[0].count,
        revenue: revenue[0].sum
      },
      inflowTrend: inflowTrend.length > 0 ? inflowTrend : [{time: '08:00', count: 0}, {time: '12:00', count: 0}],
      delayIndex: delayIndex.length > 0 ? delayIndex : [{name: 'General', value: 0}],
      capacity: capacity[0] || { occupied: 0, total: 100 },
      feed
    });

  } catch (error) {
    console.error("[ANALYTICS ERROR]", error);
    res.status(500).json({ error: "Failed to fetch clinical command data" });
  }
});

module.exports = router;
