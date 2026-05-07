const express = require("express");
const router = express.Router();
const Job = require("../models/Job");

// ─── GET /jobs ────────────────────────────────────────────────────────────────
// Query params:
//   ?type=remote|contract   filter by job type
//   ?search=react           full-text search across title, company, description
//   ?recent=true            only jobs from the last 30 days
//   ?page=1                 pagination (default page 1)
//   ?limit=20               results per page (default 20, max 50)

router.get("/", async (req, res) => {
  try {
    const cache = req.app.locals.cache;
    const cacheKey = `jobs_${JSON.stringify(req.query)}`;

    // ── Cache check ──────────────────────────────────────────────────────────
    // If this exact query was made recently, return the cached result.
    // This prevents hammering MongoDB on every page load.
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // ── Build the query filter ───────────────────────────────────────────────
    const filter = {};

    if (req.query.type) {
      filter.type = req.query.type; // 'remote' or 'contract'
    }

    if (req.query.recent === "true") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.postedAt = { $gte: thirtyDaysAgo };
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // ── Query + sort ─────────────────────────────────────────────────────────
    let query;
    let sortOption;

    if (req.query.search) {
      // Text search — MongoDB scores each document by how well it matches.
      // We add the score as a virtual field and sort by it descending,
      // so the most relevant results come first.
      // Within the same score, newer jobs come first (postedAt: -1).
      filter.$text = { $search: req.query.search };

      query = Job.find(filter, { score: { $meta: "textScore" } });
      sortOption = { score: { $meta: "textScore" }, postedAt: -1 };
    } else {
      // No search — just return newest jobs first
      query = Job.find(filter);
      sortOption = { postedAt: -1 };
    }

    // Run the query and a count in parallel for pagination metadata
    const [jobs, total] = await Promise.all([
      query.sort(sortOption).skip(skip).limit(limit).lean(), // .lean() returns plain JS objects instead of Mongoose docs
      // — much faster when you're just reading data
      Job.countDocuments(filter),
    ]);

    const result = {
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // Cache the result — expires after 5 min (stdTTL set in index.js)
    cache.set(cacheKey, result);

    res.json(result);
  } catch (err) {
    console.error("[GET /jobs]", err.message);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// ─── GET /jobs/count/recent ───────────────────────────────────────────────────
// Returns the count of jobs posted since a given timestamp.
// Used by the dashboard banner: "12 new jobs since your last visit"
// Query params:
//   ?since=2024-01-15T10:00:00.000Z   ISO timestamp

router.get("/count/recent", async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);

    const count = await Job.countDocuments({ postedAt: { $gte: since } });

    res.json({ count });
  } catch (err) {
    console.error("[GET /jobs/count/recent]", err.message);
    res.status(500).json({ error: "Failed to count recent jobs" });
  }
});

// ─── GET /jobs/:id ────────────────────────────────────────────────────────────
// Returns a single job by its MongoDB _id.
// Used by the job detail drawer on Day 12.

router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    console.error("[GET /jobs/:id]", err.message);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

module.exports = router;
