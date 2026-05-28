const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserJobMeta = require("../models/UserJobMeta");

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Expect
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// POST /meta — upsert seen=true for userId + jobId
router.post("/", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: "jobId required" });
    const meta = await UserJobMeta.findOneAndUpdate(
      { userId: req.user.userId, jobId },
      { $set: { seen: true } },
      { upsert: true, new: true },
    );
    res.json(meta);
  } catch (err) {
    console.error("[POST /meta] Error:", err.message);
    res.status(500).json({ error: "Failed to update meta" });
  }
});

// GET /meta?jobIds=id1,id2 — batch fetch seen status
router.get("/", requireAuth, async (req, res) => {
  try {
    const jobIds = (req.query.jobIds || "").split(",").filter(Boolean);
    if (!jobIds.length) return res.json([]);
    const metas = await UserJobMeta.find({
      userId: req.user.userId,
      jobId: { $in: jobIds },
    }).lean();
    res.json(metas);
  } catch (err) {
    console.error("[GET /meta]", err.message);
    res.status(500).json({ error: "Failed to fetch meta" });
  }
});

module.exports = router;
