import { Router } from "express";
import {
  startAttempt,
  submitAttempt,
  listAttemptsByExam,
  getAttempt,
} from "../controllers/attemptController.js";
import { protect, requireRole } from "../middlewares/auth.js";

const router = Router();
router.use(protect);

// Student
router.post("/start/:examId", requireRole("student"), startAttempt);
router.post("/:id/submit", requireRole("student"), submitAttempt);

// Teacher
router.get("/exam/:examId", requireRole("teacher"), listAttemptsByExam);
router.get("/:id", requireRole("teacher"), getAttempt);

export default router;