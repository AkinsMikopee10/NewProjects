const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const NodeCache = require("node-cache");
const cron = require("node-cron");
require("dotenv").config();

// Load models — this registers the schemas and creates indexes in MongoDB
require("./models/Job");
require("./models/User");
require("./models/Application");
require("./models/UserJobMeta");

// Aggregator
const { aggregateAll } = require("./services/aggregator");

const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");

const app = express();

// Middleware — runs on every request
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json()); // Parse incoming JSON request bodies

// ── In-memory cache ──────────────────────────────────────────────────────────
// stdTTL: 300 = each cached value expires after 5 minutes automatically.
// You'll use this in your /jobs route on Day 7.
// It's created here and passed around so the aggregator can flush it.
const cache = new NodeCache({ stdTTL: 300 });

// Make the cache accessible to routes via app.locals
// (you'll use this in Day 7 when building GET /jobs)
app.locals.cache = cache;

// Test route — just to confirm the server is alive
app.get("/", (req, res) => {
  res.json({ message: "JobPulse server is running" });
});

// ── Manual trigger route (useful for testing without waiting for cron) ───────
app.post("/admin/aggregate", async (req, res) => {
  try {
    const result = await aggregateAll(cache);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "JobPulse server is running" });
});

app.use("/jobs", jobRoutes);
app.use("/applications", applicationRoutes);

app.post("/admin/aggregate", async (req, res) => {
  try {
    const result = await aggregateAll(cache);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Connect to MongoDB, then start the server, then fetch jobs ────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Fetch on start — fire immediately after the server is ready.
      // This covers the case where the server was sleeping (Render free tier)
      // and wakes up with a cold DB — you want fresh jobs right away.
      console.log("[Startup] Running initial aggregation...");
      aggregateAll(cache).catch((err) =>
        console.error("[Startup] Initial aggregation failed:", err.message),
      );

      // ── Cron scheduler ─────────────────────────────────────────────────────
      // '0 */6 * * *' means: at minute 0, every 6th hour, every day.
      // So it fires at 00:00, 06:00, 12:00, 18:00 server time.
      cron.schedule("0 */6 * * *", () => {
        console.log("[Cron] Scheduled aggregation starting...");
        aggregateAll(cache).catch((err) =>
          console.error("[Cron] Aggregation failed:", err.message),
        );
      });

      console.log("[Cron] Scheduler registered — runs every 6 hours");
    });
  })

  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Stop the server if DB connection fails
  });

module.exports = { cache }; // export so the cron job can use it later
