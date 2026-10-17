import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function CreateExam() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMin: 10,
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await api.post("/exams", {
        ...form,
        durationMin: Number(form.durationMin),
      });
      nav(`/teacher/exam/${r.data._id}`);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4 fade-in">
      <Link
        to="/teacher"
        className="text-sm text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
      >
        ← Back to dashboard
      </Link>

      <form onSubmit={submit} className="glass-strong p-6 space-y-4 float-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            Create <span className="gradient-text">Exam</span>
          </h1>
          <p className="page-subtitle">
            Set up a proctored exam with time limits and tracking
          </p>
        </div>

        {err && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Exam title
            </label>
            <input
              className="input"
              placeholder="e.g. Math Quiz Chapter 3"
              value={form.title}
              onChange={set("title")}
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What is this exam about?"
              value={form.description}
              onChange={set("description")}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Duration (minutes)
            </label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="10"
              value={form.durationMin}
              onChange={set("durationMin")}
              required
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Link to="/teacher" className="btn-ghost flex-1">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? "Creating..." : "Create Exam"}
          </button>
        </div>
      </form>
    </div>
  );
}