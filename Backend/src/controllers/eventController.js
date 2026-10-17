import Event from "../models/Event.js";
import Attempt from "../models/Attempt.js";

// Student: post event (optionally with snapshot file)
// Content-Type: multipart/form-data (field "snapshot") OR JSON with base64
export const createEvent = async (req, res) => {
  try {
    const { attemptId, type, timestamp, snapshotBase64 } = req.body;
    if (!attemptId || !type)
      return res.status(400).json({ message: "attemptId & type required" });

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.student.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Forbidden" });
    if (attempt.status === "submitted")
      return res.status(400).json({ message: "Attempt already submitted" });

    let snapshot = null;
    if (req.file) snapshot = `/uploads/${req.file.filename}`;
    else if (snapshotBase64) snapshot = snapshotBase64;

    const event = await Event.create({
      attempt: attempt._id,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      snapshot,
    });

    // Update attempt risk on the fly
    const validCount = await Event.countDocuments({
      attempt: attempt._id,
      review: { $ne: "false_alarm" },
    });
    attempt.riskLevel =
      validCount >= 6 ? "high" : validCount >= 3 ? "medium" : "low";
    await attempt.save();

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: review event -> valid / false_alarm
export const reviewEvent = async (req, res) => {
  try {
    const { review } = req.body; // "valid" | "false_alarm" | "pending"
    if (!["valid", "false_alarm", "pending"].includes(review))
      return res.status(400).json({ message: "Invalid review value" });

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { review, reviewedBy: req.user._id },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Recompute attempt risk
    const validCount = await Event.countDocuments({
      attempt: event.attempt,
      review: { $ne: "false_alarm" },
    });
    const riskLevel =
      validCount >= 6 ? "high" : validCount >= 3 ? "medium" : "low";
    await Attempt.findByIdAndUpdate(event.attempt, { riskLevel });

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: rule stats for tuning screen
export const ruleStats = async (req, res) => {
  try {
    const stats = await Event.aggregate([
      { $group: { _id: "$type", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};