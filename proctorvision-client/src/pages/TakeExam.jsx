import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useDetection } from "../hooks/useDetection.js";
import {
  DEMO_QUESTIONS,
  loadAnswers,
  saveAnswers,
  clearAnswers,
  gradeAnswers,
} from "../lib/demoQuestions.js";

const EVENT_LABEL = {
  no_face: "No face detected",
  multi_face: "Multiple faces detected",
  face_away: "Face turned away",
  phone: "Phone detected",
  tab_switch: "Tab switched",
};

export default function TakeExam() {
  const { examId } = useParams();
  const nav = useNavigate();
  const videoRef = useRef(null);
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [consent, setConsent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState("Loading...");

  const [counts, setCounts] = useState({});
  const [lastWarning, setLastWarning] = useState(null);

  const [answers, setAnswers] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // 🔴 Termination state
  const [terminated, setTerminated] = useState(null); // { reason } | null

  const handleEvent = useCallback((type) => {
    setCounts((c) => ({ ...c, [type]: (c[type] || 0) + 1 }));
    setLastWarning({ type, at: Date.now() });
  }, []);

  // 🔴 Called by useDetection when backend auto-terminates
  const handleTerminated = useCallback((data) => {
    setTerminated({
      reason: data?.terminatedReason || "Suspicious activity detected",
      recentValidCount: data?.recentValidCount,
    });
    // Stop camera immediately
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((t) => t.stop());
    submittedRef.current = true; // prevent manual/auto submit from firing
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    api.get(`/exams/${examId}`).then((r) => setExam(r.data));
  }, [examId]);

  useEffect(() => {
    if (!consent) return;
    (async () => {
      try {
        const r = await api.post(`/attempts/start/${examId}`);

        // If the attempt was already terminated server-side (e.g. re-open after reload)
        if (r.data.status === "terminated") {
          setAttempt(r.data);
          setTerminated({
            reason: r.data.terminatedReason || "Suspicious activity detected",
          });
          return;
        }

        setAttempt(r.data);
        setStatus("Camera starting...");
        setAnswers(loadAnswers(r.data._id));

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("Proctoring active");
      } catch (e) {
        setStatus("Error: " + (e.response?.data?.message || e.message));
      }
    })();
  }, [consent, examId]);

  useEffect(() => {
    if (attempt?._id && Object.keys(answers).length > 0) {
      saveAnswers(attempt._id, answers);
    }
  }, [answers, attempt?._id]);

  useEffect(() => {
    if (!attempt) return;
    if (terminated) return; // don't tick after termination
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(attempt.endsAt) - Date.now()) / 1000)
      );
      setRemaining(left);
      if (left === 0) autoSubmit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, terminated]);

  useDetection({
    videoRef,
    attemptId: attempt?._id,
    enabled: !!attempt && !terminated,
    onEvent: handleEvent,
    onTerminated: handleTerminated,
  });

  const pickOption = (qId, optIdx) => {
    setAnswers((a) => ({ ...a, [qId]: optIdx }));
  };

  const callSubmitApi = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api.post(`/attempts/${attempt._id}/submit`);
    } catch (e) {}
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((t) => t.stop());
    setSummary(gradeAnswers(answers));
    setSubmitting(false);
  };

  const autoSubmit = async () => {
    if (!attempt || submittedRef.current) return;
    setConfirmOpen(false);
    await callSubmitApi();
  };

  const manualSubmitClick = () => {
    if (!attempt) return;
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    await callSubmitApi();
  };

  const finishAndLeave = () => {
    clearAnswers(attempt?._id);
    nav("/student");
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const totalWarnings = Object.values(counts).reduce((a, b) => a + b, 0);
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round(
    (answeredCount / DEMO_QUESTIONS.length) * 100
  );

  // ===== 🔴 TERMINATED SCREEN =====
  if (terminated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 fade-in">
        <div className="glass-strong p-8 max-w-md w-full space-y-4 float-up text-center border-red-500/40">
          <div className="text-5xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-300">
            Exam Terminated
          </h1>
          <p className="text-sm text-slate-300">
            This session was automatically ended because a suspicious pattern
            was detected by the system.
          </p>

          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-left text-sm space-y-1">
            <p className="text-red-200 font-semibold">Reason</p>
            <p className="text-red-100 text-xs">
              {terminated.reason}
            </p>
            {terminated.recentValidCount != null && (
              <p className="text-red-200/80 text-xs pt-1">
                {terminated.recentValidCount} valid events in the last 5
                minutes.
              </p>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-left text-xs text-slate-300">
            Your responses have been saved. Your teacher will review the
            session and make the final decision.
          </div>

          <button onClick={finishAndLeave} className="btn-danger w-full">
            Leave Exam
          </button>
        </div>
      </div>
    );
  }

  // ===== SUMMARY SCREEN =====
  if (summary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 fade-in">
        <div className="glass-strong p-8 max-w-md w-full space-y-4 float-up text-center">
          <div className="text-4xl">
            {summary.correct === summary.total ? "🏆" : "✅"}
          </div>
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">Exam Submitted</span>
          </h1>
          <p className="text-sm text-slate-400">
            Your responses were submitted. Camera stopped.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="glass p-3">
              <p className="text-xs text-slate-400">Answered</p>
              <p className="text-xl font-bold text-indigo-300">
                {summary.answered}/{summary.total}
              </p>
            </div>
            <div className="glass p-3">
              <p className="text-xs text-slate-400">Correct</p>
              <p className="text-xl font-bold text-green-300">
                {summary.correct}
              </p>
            </div>
            <div className="glass p-3">
              <p className="text-xs text-slate-400">Warnings</p>
              <p
                className={`text-xl font-bold ${
                  totalWarnings === 0
                    ? "text-green-300"
                    : totalWarnings < 3
                    ? "text-yellow-300"
                    : "text-red-300"
                }`}
              >
                {totalWarnings}
              </p>
            </div>
          </div>

          <button onClick={finishAndLeave} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ===== CONSENT SCREEN =====
  if (!consent) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4 fade-in">
        <h1 className="text-2xl font-bold">{exam?.title || "Exam"}</h1>
        <div className="glass-strong p-6 space-y-3 float-up">
          <p>
            This exam uses your <b>camera</b> to detect cheating events. All
            detection runs <b>on your device</b>; only short event snapshots
            are sent to the server. By continuing, you consent.
          </p>
          <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
            <li>{DEMO_QUESTIONS.length} questions, timed</li>
            <li>Answers are saved locally as you go</li>
            <li>You'll see a summary after submitting</li>
            <li className="text-red-300">
              ⚠️ Repeated violations may auto-terminate the exam
            </li>
          </ul>
          <button
            onClick={() => setConsent(true)}
            className="btn-primary w-full"
          >
            I Consent — Start Exam
          </button>
        </div>
      </div>
    );
  }

  // ===== ACTIVE EXAM =====
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="page-title">{exam?.title || "Exam"}</h1>
          <p className="page-subtitle">
            {answeredCount}/{DEMO_QUESTIONS.length} answered
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700">
            ⏱ {mm}:{ss}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full border ${
              totalWarnings === 0
                ? "bg-green-500/10 border-green-500/40 text-green-300"
                : totalWarnings < 3
                ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-300"
                : "bg-red-500/10 border-red-500/40 text-red-300"
            }`}
          >
            ⚠️ {totalWarnings}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: Questions */}
        <div className="lg:col-span-2 glass p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-semibold">Questions</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{progressPct}%</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {DEMO_QUESTIONS.map((q, idx) => {
              const picked = answers[q.id];
              return (
                <div
                  key={q.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3"
                >
                  <p className="text-sm font-medium mb-2">
                    <span className="text-indigo-400 font-bold">
                      {idx + 1}.
                    </span>{" "}
                    {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isPicked = picked === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => pickOption(q.id, optIdx)}
                          className={`text-left text-xs rounded-md px-3 py-2 border transition-all active:scale-[0.98] ${
                            isPicked
                              ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30"
                              : "bg-slate-700/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70 mr-1.5">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: camera + timer */}
        <div className="space-y-3">
          <div className="glass p-3 relative">
            <p className="text-xs text-slate-400 mb-2">Camera preview</p>
            <video
              ref={videoRef}
              className="w-full rounded bg-black"
              autoPlay
              muted
              playsInline
            />
            {lastWarning && (
              <div
                key={lastWarning.at}
                className="absolute top-3 left-3 bg-red-600/95 text-white px-3 py-1.5 rounded-lg font-semibold shadow-lg animate-pulse text-xs"
              >
                ⚠️ {EVENT_LABEL[lastWarning.type] || lastWarning.type} (
                {counts[lastWarning.type]})
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
            {totalWarnings === 0 ? (
              <span className="text-xs text-green-400">
                ✓ No issues detected
              </span>
            ) : (
              Object.entries(counts).map(([type, n]) => (
                <span
                  key={type}
                  className="bg-slate-800 border border-red-500/40 text-red-300 px-2 py-0.5 rounded-full text-[10px]"
                >
                  {EVENT_LABEL[type] || type}: <b>{n}</b>
                </span>
              ))
            )}
          </div>

          <div className="glass p-4 space-y-2">
            <p className="text-xs text-slate-400">Time remaining</p>
            <p
              className={`text-3xl font-mono ${
                remaining < 60 ? "text-red-400 animate-pulse" : ""
              }`}
            >
              {mm}:{ss}
            </p>
            <p className="text-xs text-slate-400 mt-2">{status}</p>

            <button
              onClick={manualSubmitClick}
              disabled={submitting}
              className="btn-danger w-full mt-3"
            >
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== CONFIRM MODAL ===== */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-in">
          <div className="glass-strong p-6 max-w-sm w-full space-y-4 float-up">
            <h2 className="text-xl font-bold">Submit exam?</h2>
            <p className="text-sm text-slate-400">
              You've answered <b className="text-indigo-300">{answeredCount}</b>{" "}
              of <b>{DEMO_QUESTIONS.length}</b> questions.
              {answeredCount < DEMO_QUESTIONS.length && (
                <span className="block mt-1 text-yellow-300">
                  ⚠️ {DEMO_QUESTIONS.length - answeredCount} unanswered —
                  they'll be marked wrong.
                </span>
              )}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button onClick={confirmSubmit} className="btn-danger flex-1">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}