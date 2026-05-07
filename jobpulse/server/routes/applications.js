const express = require("express");
const router = express.Router();
const Application = require("../models/Application");

// ─── GET /applications ────────────────────────────────────────────────────────
// Returns all applications for the logged-in user.
// ?status=saved|applied|interview|rejected   filter by status

router.get("/", async (req, res) => {
  try {
    // TODO Day 8: replace hardcoded userId with req.user._id from auth middleware
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const filter = { userId };
    if (req.query.status) filter.status = req.query.status;

    const applications = await Application.find(filter)
      .populate("jobId") // fetch the full job document, not just the ID
      .sort({ dateApplied: -1 })
      .lean();

    res.json(applications);
  } catch (err) {
    console.error("[GET /applications]", err.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ─── POST /applications ───────────────────────────────────────────────────────
// Creates or returns an existing application.
// Idempotent — calling it twice with the same userId + jobId
// returns the existing record rather than creating a duplicate.

router.post("/", async (req, res) => {
  try {
    const { userId, jobId, status = "saved" } = req.body;
    if (!userId || !jobId) {
      return res.status(400).json({ error: "userId and jobId are required" });
    }

    // Check if application already exists before creating
    const existing = await Application.findOne({ userId, jobId });
    if (existing) {
      return res.json(existing); // return the existing one, don't duplicate
    }

    const application = await Application.create({ userId, jobId, status });
    res.status(201).json(application);
  } catch (err) {
    console.error("[POST /applications]", err.message);
    res.status(500).json({ error: "Failed to create application" });
  }
});

// ─── PATCH /applications/:id ──────────────────────────────────────────────────
// Updates the status or notes on an application.
// Used by the tracker status dropdown and inline notes on Day 17.

router.patch("/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = {};

    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }, // return the updated document, not the old one
    ).lean();

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    console.error("[PATCH /applications/:id]", err.message);
    res.status(500).json({ error: "Failed to update application" });
  }
});

module.exports = router;
