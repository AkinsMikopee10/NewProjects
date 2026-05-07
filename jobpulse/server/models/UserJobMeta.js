const mongoose = require("mongoose");

const userJobMetaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Unique composite — one meta record per user per job
userJobMetaSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("UserJobMeta", userJobMetaSchema);
