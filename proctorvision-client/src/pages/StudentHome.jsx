import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentHome() {
  const { user, logout } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/exams")
      .then((r) => setExams(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="page-title">
            <span className="gradient-text">Available</span> Exams
          </h1>
          <p className="page-subtitle">
            Choose an exam to begin. Your camera will be used for proctoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm text-slate-300">{user.name}</span>
          </div>
          <button onClick={logout} className="btn-ghost text-sm">
            Logout
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {exams.length} {exams.length === 1 ? "exam" : "exams"} available
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="glass p-6 text-center text-slate-400">
            Loading exams...
          </div>
        )}

        {!loading && exams.length === 0 && (
          <div className="glass p-10 text-center space-y-2">
            <div className="text-4xl">🎓</div>
            <p className="font-semibold text-slate-200">No exams available</p>
            <p className="text-sm text-slate-400">
              Check back later — your teacher hasn't published any exams yet.
            </p>
          </div>
        )}

        {exams.map((ex) => (
          <div
            key={ex._id}
            className="glass card-hover p-4 flex justify-between items-center gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0">
                📝
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{ex.title}</p>
                <p className="text-xs text-slate-400">
                  ⏱ {ex.durationMin} min
                  {ex.description && (
                    <span className="text-slate-500"> · {ex.description}</span>
                  )}
                </p>
              </div>
            </div>
            <Link
              to={`/student/exam/${ex._id}`}
              className="btn-primary whitespace-nowrap"
            >
              Take Exam →
            </Link>
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="glass p-4 flex items-start gap-3 text-sm">
        <span className="text-lg">🛡️</span>
        <div>
          <p className="font-semibold text-slate-200">Privacy-first proctoring</p>
          <p className="text-slate-400 text-xs mt-0.5">
            All AI detection runs locally on your device. Only short event
            snapshots are sent to your teacher for review — never full video.
          </p>
        </div>
      </div>
    </div>
  );
}