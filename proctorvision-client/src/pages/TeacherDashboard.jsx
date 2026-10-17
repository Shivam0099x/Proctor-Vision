import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function TeacherDashboard() {
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
            <span className="gradient-text">Teacher</span> Dashboard
          </h1>
          <p className="page-subtitle">Manage your exams and proctor sessions</p>
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

      {/* CTA */}
      <div className="flex items-center justify-between">
        <Link to="/teacher/create" className="btn-primary">
          <span className="text-lg leading-none">+</span> Create Exam
        </Link>
        <p className="text-sm text-slate-400">
          {exams.length} {exams.length === 1 ? "exam" : "exams"} total
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
            <div className="text-4xl">📝</div>
            <p className="font-semibold text-slate-200">No exams yet</p>
            <p className="text-sm text-slate-400">
              Click "Create Exam" to get started.
            </p>
          </div>
        )}

        {exams.map((ex) => (
          <Link
            key={ex._id}
            to={`/teacher/exam/${ex._id}`}
            className="glass card-hover p-4 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0">
                📘
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{ex.title}</p>
                <p className="text-xs text-slate-400 truncate">
                  {ex.durationMin} min · {new Date(ex.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-indigo-400 transition-colors text-xl">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}