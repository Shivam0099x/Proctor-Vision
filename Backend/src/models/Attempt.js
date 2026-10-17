import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true }, // server-side authoritative end time
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ["active", "submitted", "terminated"], // 👈 added "terminated"
      default: "active",
    },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low" },
    terminatedReason: { type: String }, // 👈 optional, for audit / teacher view
  },
  { timestamps: true }
);

export default mongoose.model("Attempt", attemptSchema);