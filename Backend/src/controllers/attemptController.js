import Attempt from "../models/Attempt.js";
import Exam from "../models/Exam.js";
import Event from "../models/Event.js";

// Student: start attempt (server-side timer authority)
export const startAttempt = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    let attempt = await Attempt.findOne({
      exam: exam._id,
      student: req.user._id,
      status: "active",
    });

    if (!attempt) {
      const endsAt = new Date(Date.now() + exam.durationMin * 60 * 1000);
      attempt = await Attempt.create({
        exam: exam._id,
        student: req.user._id,
        startedAt: new Date(),
        endsAt,
      });
    }

    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Student: submit attempt
export const submitAttempt = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.student.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Forbidden" });

    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    await attempt.save();
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: list attempts for exam, with risk (based on events)
export const listAttemptsByExam = async (req, res) => {
  try {
    const attempts = await Attempt.find({ exam: req.params.examId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    // Compute riskLevel quickly (valid events only)
    const withRisk = await Promise.all(
      attempts.map(async (a) => {
        const validCount = await Event.countDocuments({
          attempt: a._id,
          review: { $ne: "false_alarm" },
        });
        const riskLevel =
          validCount >= 6 ? "high" : validCount >= 3 ? "medium" : "low";
        return { ...a.toObject(), riskLevel, validEventCount: validCount };
      })
    );

    res.json(withRisk);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: get single attempt with events
export const getAttempt = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate("student", "name email")
      .populate("exam", "title durationMin");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const events = await Event.find({ attempt: attempt._id }).sort({ timestamp: 1 });
    res.json({ attempt, events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};