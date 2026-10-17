import { Router } from "express";
import {
  createEvent,
  reviewEvent,
  ruleStats,
} from "../controllers/eventController.js";
import { protect, requireRole } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";

const router = Router();
router.use(protect);

// Student: create event (multipart; snapshot optional)
router.post("/", requireRole("student"), upload.single("snapshot"), createEvent);

// Teacher
router.patch("/:id/review", requireRole("teacher"), reviewEvent);
router.get("/stats/rules", requireRole("teacher"), ruleStats);

export default router;