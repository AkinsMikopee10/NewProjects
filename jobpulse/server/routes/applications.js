const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Application = require("../models/Application");

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ─── GET /applications ────────────────────────────────────────────────────────
// Returns all applications for the logged-in user.
// ?status=saved|applied|interview|rejected   filter by status

router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.status) filter.status = req.query.status;

    const applications = await Application.find(filter)
      .populate("jobId") // fetch the full job document, not just the ID
      .sort({ updatedAt: -1 })
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

router.post("/", requireAuth, async (req, res) => {
  try {
    const { jobId, status = "saved" } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    // Check if application already exists before creating
    const existing = await Application.findOne({
      userId: req.user.userId,
      jobId,
    });
    if (existing) {
      // Already exists — update status if the new one is a progression
      const updated = await Application.findByIdAndUpdate(
        existing._id,
        { $set: { status } },
        { new: true },
      )
        .populate("jobId")
        .lean();
      return res.json(updated);
    }

    const application = await Application.create({
      userId: req.user.userId,
      jobId,
      status,
    });
    const populated = await Application.findById(application._id)
      .populate("jobId")
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error("[POST /applications]", err.message);
    res.status(500).json({ error: "Failed to create application" });
  }
});

// ─── PATCH /applications/:id ──────────────────────────────────────────────────
// Updates the status or notes on an application.
// Used by the tracker status dropdown and inline notes on Day 17.

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = {};

    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: update },
      { new: true }, // return the updated document, not the old one
    )
      .populate("jobId")
      .lean();

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    console.error("[PATCH /applications/:id]", err.message);
    res.status(500).json({ error: "Failed to update application" });
  }
});

// DELETE /applications/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /applications/:id]", err.message);
    res.status(500).json({ error: "Failed to delete application" });
  }
});

module.exports = router;
