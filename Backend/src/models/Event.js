import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true },
    type: {
      type: String,
      enum: ["no_face", "multi_face", "face_away", "phone", "tab_switch"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    snapshot: { type: String }, // base64 or /uploads/xxx.jpg path
    review: {
      type: String,
      enum: ["pending", "valid", "false_alarm"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);