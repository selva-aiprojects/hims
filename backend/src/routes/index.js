const express = require("express");
const authRoutes = require("../modules/auth");
const nexusRoutes = require("../modules/nexus");
const tenantRoutes = require("../modules/tenant");
const patientRoutes = require("../modules/patient");
const appointmentRoutes = require("../modules/appointment");
const consultationRoutes = require("../modules/consultation");
const billingRoutes = require("../modules/billing");
const doctorRoutes = require("../modules/doctor");
const insuranceRoutes = require("../modules/insurance");
const abhaRoutes = require("../modules/abha");
const { auth } = require("../middleware/auth");
const { tenant } = require("../middleware/tenant");

const hospitalRoutes = require("../modules/hospital");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/nexus", nexusRoutes);
router.use("/hospital", tenant, hospitalRoutes); // Temporarily removed auth for testing
router.use("/tenants", auth, tenant, tenantRoutes);
router.use("/patients", auth, tenant, patientRoutes);
router.use("/appointments", auth, tenant, appointmentRoutes);
router.use("/consultations", auth, tenant, consultationRoutes);
router.use("/billing", auth, tenant, billingRoutes);
router.use("/insurance", auth, tenant, insuranceRoutes);
router.use("/doctor", auth, tenant, doctorRoutes);
router.use("/doctors", auth, tenant, doctorRoutes);
router.use("/abha", abhaRoutes);

module.exports = router;