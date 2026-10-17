import { useEffect, useRef } from "react";
import { api } from "../lib/api.js";

// Load models lazily from CDN
const MP_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm";
const MP_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function useDetection({ videoRef, attemptId, enabled, onEvent, onTerminated }) {
  const stopFlag = useRef(false);
  const lastPost = useRef({});
  const awayStart = useRef(null);
  const terminatedRef = useRef(false); // stop posting after termination

  useEffect(() => {
    if (!enabled || !attemptId) return;
    stopFlag.current = false;
    terminatedRef.current = false;

    let faceLandmarker, coco, faceLoopId, objLoopId;
    let lastVideoTime = -1;

    const cooldown = 4000; // ms per event type
    const canPost = (type) => {
      if (terminatedRef.current) return false; // 🔴 shut down after terminate
      const now = Date.now();
      if (!lastPost.current[type] || now - lastPost.current[type] > cooldown) {
        lastPost.current[type] = now;
        return true;
      }
      return false;
    };

    const post = async (type, snapshotDataUrl) => {
      if (!canPost(type)) return;
      try {
        const r = await api.post("/events", {
          attemptId,
          type,
          snapshotBase64: snapshotDataUrl,
        });
        // 🔔 notify UI of the recorded event
        onEvent?.(type, r.data);

        // 🔴 auto-terminate signal from backend → stop all detection + notify
        if (r.data?.attemptTerminated) {
          terminatedRef.current = true;
          stopFlag.current = true;             // freeze loops
          clearTimeout(faceLoopId);
          clearTimeout(objLoopId);
          document.removeEventListener("visibilitychange", tabHandler);
          try { faceLandmarker?.close?.(); } catch {}
          onTerminated?.(r.data);              // 👈 hand off to TakeExam
        }
      } catch (e) {
        console.warn("event post failed", type, e.message);
      }
    };

    const capture = () => {
      const v = videoRef.current;
      if (!v) return null;
      const c = document.createElement("canvas");
      const w = 240;
      const h = Math.round((v.videoHeight / v.videoWidth) * w) || 180;
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(v, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.6);
    };

    const tabHandler = () => {
      if (document.hidden) post("tab_switch", capture());
    };

    const init = async () => {
      // Face Landmarker
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;
      const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
      faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MP_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 2,
      });

      // COCO-SSD
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoMod = await import("@tensorflow-models/coco-ssd");
      coco = await cocoMod.load({ base: "lite_mobilenet_v2" });

      document.addEventListener("visibilitychange", tabHandler);

      // Face loop ~2Hz
      const faceTick = () => {
        if (stopFlag.current) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.currentTime !== lastVideoTime) {
          lastVideoTime = v.currentTime;
          try {
            const res = faceLandmarker.detectForVideo(v, performance.now());
            const faces = res.faceLandmarks?.length || 0;
            if (faces === 0) post("no_face", capture());
            else if (faces > 1) post("multi_face", capture());
            else {
              const lm = res.faceLandmarks[0];
              const nose = lm[1];
              if (nose.x < 0.35 || nose.x > 0.65) {
                if (!awayStart.current) awayStart.current = Date.now();
                else if (Date.now() - awayStart.current > 3000)
                  post("face_away", capture());
              } else {
                awayStart.current = null;
              }
            }
          } catch (e) {}
        }
        faceLoopId = setTimeout(faceTick, 500);
      };
      faceTick();

      // Object loop ~ every 1.5s
      const objTick = async () => {
        if (stopFlag.current) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2) {
          try {
            const preds = await coco.detect(v);
            const phone = preds.find(
              (p) => p.class === "cell phone" && p.score > 0.6
            );
            if (phone) post("phone", capture());
          } catch (e) {}
        }
        objLoopId = setTimeout(objTick, 1500);
      };
      objTick();
    };

    init().catch((e) => console.error("model init failed", e));

    return () => {
      stopFlag.current = true;
      clearTimeout(faceLoopId);
      clearTimeout(objLoopId);
      document.removeEventListener("visibilitychange", tabHandler);
      faceLandmarker?.close?.();
    };
  }, [enabled, attemptId, videoRef, onEvent, onTerminated]);
}