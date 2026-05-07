const axios = require("axios");
const Job = require("../models/Job");
const {
  normalizeRemotive,
  normalizeRemoteOK,
  normalizeArbeitnow,
  isValidJob, // import the guard function
} = require("./normalizers");

// ─── Per-source fetch functions ───────────────────────────────────────────────
// Each one fetches from its API and returns an array of normalized job objects.
// If ANYTHING goes wrong (network error, bad response, API down), it logs the
// error and returns an empty array — it never throws. This means one broken
// API can never take down the whole aggregation run.

async function fetchRemotive() {
  try {
    const { data } = await axios.get("https://remotive.com/api/remote-jobs", {
      timeout: 10000, // 10 seconds — don't wait forever
    });

    // Remotive wraps jobs in a { jobs: [...] } envelope
    const jobs = data?.jobs;
    if (!Array.isArray(jobs)) {
      console.warn("[Remotive] Unexpected response shape:", typeof jobs);
      return [];
    }

    console.log(`[Remotive] Fetched ${jobs.length} raw jobs`);
    return jobs.map(normalizeRemotive);
  } catch (err) {
    console.error("[Remotive] Fetch failed:", err.message);
    return [];
  }
}

async function fetchRemoteOK() {
  try {
    const { data } = await axios.get("https://remoteok.com/api", {
      timeout: 10000,
      headers: {
        // RemoteOK blocks requests without a User-Agent header
        "User-Agent": "JobPulse/1.0 (job aggregator)",
      },
    });

    if (!Array.isArray(data)) {
      console.warn("[RemoteOK] Unexpected response shape:", typeof data);
      return [];
    }

    // RemoteOK always puts a metadata object as the FIRST element — skip it
    // It looks like: { "legal": "...", "apiVersion": 2, ... }
    const jobs = data.filter((item, index) => index !== 0 && item.id);

    console.log(`[RemoteOK] Fetched ${jobs.length} raw jobs`);
    return jobs.map(normalizeRemoteOK);
  } catch (err) {
    console.error("[RemoteOK] Fetch failed:", err.message);
    return [];
  }
}

async function fetchArbeitnow() {
  try {
    const { data } = await axios.get(
      "https://www.arbeitnow.com/api/job-board-api",
      { timeout: 10000 },
    );

    // Arbeitnow wraps jobs in a { data: [...] } envelope
    const jobs = data?.data;
    if (!Array.isArray(jobs)) {
      console.warn("[Arbeitnow] Unexpected response shape:", typeof jobs);
      return [];
    }

    console.log(`[Arbeitnow] Fetched ${jobs.length} raw jobs`);
    return jobs.map(normalizeArbeitnow);
  } catch (err) {
    console.error("[Arbeitnow] Fetch failed:", err.message);
    return [];
  }
}

// ─── Main aggregation function ────────────────────────────────────────────────

async function aggregateAll(cache) {
  console.log("[Aggregator] Starting aggregation run...");
  const startTime = Date.now();

  // Fetch all three sources IN PARALLEL — Promise.allSettled means
  // if one fails, the others still complete. We're not using Promise.all
  // because that would throw on the first failure.
  const results = await Promise.allSettled([
    fetchRemotive(),
    fetchRemoteOK(),
    fetchArbeitnow(),
  ]);

  // Collect successful results, log failures
  const allJobs = [];
  const sourceNames = ["Remotive", "RemoteOK", "Arbeitnow"];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allJobs.push(...result.value);
    } else {
      console.error(`[Aggregator] ${sourceNames[i]} rejected:`, result.reason);
    }
  });

  const validJobs = allJobs.filter(isValidJob);
  const skipped = allJobs.length - validJobs.length;

  if (skipped > 0) {
    console.warn(
      `[Aggregator] Skipped ${skipped} invalid jobs (missing url or dedupeKey)`,
    );
  }

  console.log(
    `[Aggregator] Total normalized jobs to upsert: ${validJobs.length}`,
  );

  if (validJobs.length === 0) {
    console.warn("[Aggregator] No jobs fetched — skipping upsert");
    return { upserted: 0, total: 0 };
  }

  // ── Upsert to MongoDB ──────────────────────────────────────────────────────
  // bulkWrite with upsert: we try to insert each job.
  // If a job with the same dedupeKey already exists, we UPDATE it (to refresh
  // the data). If it doesn't exist, we INSERT it.
  // This is the "store all, never discard at ingest time" principle from the roadmap.

  const bulkOps = validJobs.map((job) => ({
    updateOne: {
      filter: { dedupeKey: job.dedupeKey },
      update: { $set: job },
      upsert: true, // insert if not found, update if found
    },
  }));

  let upsertedCount = 0;
  try {
    const result = await Job.bulkWrite(bulkOps, {
      ordered: false, // don't stop on a single failure — process all
    });
    upsertedCount = result.upsertedCount + result.modifiedCount;
    console.log(
      `[Aggregator] Upserted ${result.upsertedCount} new, ` +
        `updated ${result.modifiedCount} existing jobs`,
    );
  } catch (err) {
    // bulkWrite can throw on duplicate key errors even with upsert — handle it
    console.error("[Aggregator] bulkWrite error:", err.message);
  }

  // ── Flush the cache ────────────────────────────────────────────────────────
  // Fresh jobs are now in the DB — expire the cache immediately so the
  // next request to GET /jobs returns the new data, not the old cached result.
  if (cache) {
    cache.flushAll();
    console.log("[Aggregator] Cache flushed");
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Aggregator] Run complete in ${duration}s`);

  return { upserted: upsertedCount, total: validJobs.length };
}

module.exports = { aggregateAll };
