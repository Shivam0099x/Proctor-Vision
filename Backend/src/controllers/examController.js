import Exam from "../models/Exam.js";

// Teacher: create exam
export const createExam = async (req, res) => {
  try {
    const { title, description, durationMin } = req.body;
    if (!title || !durationMin)
      return res.status(400).json({ message: "title & durationMin required" });

    const exam = await Exam.create({
      title,
      description,
      durationMin,
      createdBy: req.user._id,
    });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: list own exams
export const listExams = async (req, res) => {
  try {
    const filter = req.user.role === "teacher" ? { createdBy: req.user._id } : {};
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Any authenticated: get single exam
export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};