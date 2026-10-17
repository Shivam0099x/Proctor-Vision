import { Router } from "express";
import {
  createExam,
  listExams,
  getExam,
} from "../controllers/examController.js";
import { protect, requireRole } from "../middlewares/auth.js";

const router = Router();
router.use(protect);

router.post("/", requireRole("teacher"), createExam);
router.get("/", listExams);
router.get("/:id", getExam);

export default router;