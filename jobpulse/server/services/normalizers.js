// ─── Helpers ────────────────────────────────────────────────────────────────

// Safely extract a domain from a URL — used as the third deduplication factor
function sourceDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

// Clean up a job title for deduplication comparison
function normalizeTitle(t = "") {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

// Clean up a company name for deduplication comparison
function normalizeCompany(c = "") {
  return c
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|co|corp)\b\.?/g, "") // strip legal suffixes
    .trim();
}

// Build the dedupeKey — the unique fingerprint for a job
// We use sourceDomain (not location) as the third factor because
// location strings like "Remote", "Worldwide", "", null are
// wildly inconsistent across APIs and would break deduplication.
function buildDedupeKey(title, company, url) {
  return [
    normalizeTitle(title),
    normalizeCompany(company),
    sourceDomain(url),
  ].join("_");
}

// Parse any date string or timestamp into a JS Date object.
// Returns today's date if the input is missing or unparseable.
function parseDate(raw) {
  if (!raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Convert a comma-separated string or an array into a clean string array.
// APIs return tags in wildly different formats — this handles all of them.
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string")
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

// ─── Per-source normalizers ──────────────────────────────────────────────────

// Remotive returns: { jobs: [ { id, title, company_name, candidate_required_location,
//                               tags, url, publication_date, job_type, description } ] }
function normalizeRemotive(job) {
  const title = (job.title || "Untitled").trim();
  const company = (job.company_name || "Unknown").trim();
  const url = job.url || "";

  return {
    title,
    company,
    location: (job.candidate_required_location || "Remote").trim(),
    tags: parseTags(job.tags),
    url,
    source: "remotive",
    postedAt: parseDate(job.publication_date),
    type: "remote",
    description: (job.description || "").trim(),
    dedupeKey: buildDedupeKey(title, company, url),
  };
}

// RemoteOK returns an array where the first element is metadata — skip it.
// Each job looks like: { id, position, company, tags, url, date, description }
function normalizeRemoteOK(job) {
  const title = (job.position || job.title || "Untitled").trim();
  const company = (job.company || "Unknown").trim();
  const url = job.url || "";

  return {
    title,
    company,
    location: "Remote",
    tags: parseTags(job.tags),
    url,
    source: "remoteok",
    postedAt: parseDate(job.date), // RemoteOK sends a Unix timestamp
    type: "remote",
    description: (job.description || "").trim(),
    dedupeKey: buildDedupeKey(title, company, url),
  };
}

// Arbeitnow returns: { data: [ { title, company_name, location, tags,
//                                url, created_at, remote, description } ] }
function normalizeArbeitnow(job) {
  const title = (job.title || "Untitled").trim();
  const company = (job.company_name || "Unknown").trim();
  const url = job.url || "";

  return {
    title,
    company,
    location: (job.location || "Remote").trim(),
    tags: parseTags(job.tags),
    url,
    source: "arbeitnow",
    postedAt: parseDate(job.created_at),
    // Arbeitnow has both remote and contract jobs — check the remote flag
    type: job.remote ? "remote" : "contract",
    description: (job.description || "").trim(),
    dedupeKey: buildDedupeKey(title, company, url),
  };
}

// Validates that a normalized job is safe to upsert.
// Returns true if the job has the minimum required fields.
function isValidJob(job) {
  if (!job.url || job.url.trim() === "") {
    return false; // can't apply without a URL
  }
  if (!job.dedupeKey || job.dedupeKey === "__") {
    return false; // dedupeKey would cause collisions
  }
  return true;
}

module.exports = {
  normalizeRemotive,
  normalizeRemoteOK,
  normalizeArbeitnow,
  isValidJob, // export the guard
};
