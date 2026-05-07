const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: "Remote" },
    tags: [String],
    url: { type: String, required: true },
    source: { type: String, required: true }, // 'remotive' | 'remoteok' | 'arbeitnow'
    postedAt: { type: Date, default: Date.now },
    type: { type: String, enum: ["remote", "contract"], default: "remote" },
    description: { type: String, default: "" },
    dedupeKey: { type: String, unique: true, required: true },

    // Analytics counters — incremented atomically, never read-modify-write
    views: { type: Number, default: 0 },
    applies: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
);

// --- Indexes ---

// Most queries sort by newest first — this index makes that instant
jobSchema.index({ postedAt: -1 });

// Filter by job type (remote vs contract)
jobSchema.index({ type: 1 });

// Filter by which API it came from
jobSchema.index({ source: 1 });

// Full-text search across title, company, and description
jobSchema.index(
  { title: "text", company: "text", description: "text" },
  { weights: { title: 3, company: 2, description: 1 } },
  // title matches are worth more than description matches
);

module.exports = mongoose.model("Job", jobSchema);
