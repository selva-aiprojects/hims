const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { prisma } = require("./config/prisma");
const { audit } = require("./middleware/audit");

const app = express();

// CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Attach Prisma to req globally
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check before other middleware
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/health-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use(audit);
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error("--- ERROR ---");
  console.error(err);
  console.error("-------------");
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: err.code || null
  });
});

module.exports = app;