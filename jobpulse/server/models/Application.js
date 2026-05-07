const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    status: {
      type: String,
      enum: ["saved", "applied", "interview", "rejected"],
      default: "saved",
    },
    notes: { type: String, default: "" },
    dateApplied: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Fast lookup of all applications for a user
applicationSchema.index({ userId: 1 });

// Fast filtering by status (the tracker tabs: Saved / Applied / Interview / Rejected)
applicationSchema.index({ status: 1 });

// Sort applications by most recent first
applicationSchema.index({ dateApplied: -1 });

// MOST IMPORTANT: prevents a user from applying to the same job twice.
// The unique composite index is your idempotency guarantee.
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
